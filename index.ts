import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const config = new pulumi.Config();

const repoArgs: aws.ecr.RepositoryArgs = {
    encryptionConfigurations: config_getObjectOutput("encryptionConfigurations"),
    forceDelete: config_getBooleanOutput("forceDelete"),
    imageScanningConfiguration: config_getObjectOutput("imageScanningConfiguration"),
    imageTagMutability: config_getOutput("imageTagMutability"),
    name: config_getOutput("name"),
    tags: config_getObjectOutput("tags"),
};

// This would be much simpler but it doesn't work because of config values are returned
// as strings, so the shape of the object doesn't match the args type.
// const args = config_getAll() as ecr.RepositoryArgs;
// pulumi.jsonStringify(args).apply(v => console.log('Config Args:', v));

const lowerCaseName = pulumi.getStack().toLowerCase();
const lifecyclePolicy = config.getObject<lifecyclePolicyInputs>("lifecyclePolicy")

const repository = new aws.ecr.Repository(lowerCaseName, repoArgs);

let lifecyclePolicyRes = undefined;
if (!lifecyclePolicy?.skip) {
    lifecyclePolicyRes = new aws.ecr.LifecyclePolicy(
        lowerCaseName,
        {
            repository: repository.name,
            policy: buildLifecyclePolicy(lifecyclePolicy),
        });
}

export const repositoryId = repository.id;
export const lifecyclePolicyId = lifecyclePolicyRes?.id;

interface lifecyclePolicyRuleInputs {
    readonly description?: pulumi.Input<string>;
    readonly maximumAgeLimit?: pulumi.Input<number>;
    readonly maximumNumberOfImages?: pulumi.Input<number>;
    readonly tagPrefixList?: pulumi.Input<pulumi.Input<string>[]>;
    readonly tagStatus: pulumi.Input<"any" | "untagged" | "tagged">;
  }
  
  interface lifecyclePolicyInputs {
    readonly rules?: pulumi.Input<pulumi.Input<lifecyclePolicyRuleInputs>[]>;
    readonly skip?: boolean;
  }

  function buildLifecyclePolicy(
    lifecyclePolicy: lifecyclePolicyInputs | undefined,
  ): pulumi.Input<aws.ecr.LifecyclePolicyDocument> {
    const rules = lifecyclePolicy?.rules;
    if (!rules) {
      return convertRules([
        {
          description: "remove untagged images",
          tagStatus: "untagged",
          maximumNumberOfImages: 1,
        },
      ]);
    }
    return pulumi.output(rules).apply((rules) => convertRules(rules));
  }
  
  function convertRules(
    rules: pulumi.Unwrap<lifecyclePolicyRuleInputs>[],
  ): aws.ecr.LifecyclePolicyDocument {
    const result: aws.ecr.LifecyclePolicyDocument = { rules: [] };
  
    const nonAnyRules = rules.filter((r) => r.tagStatus !== "any");
    const anyRules = rules.filter((r) => r.tagStatus === "any");
  
    if (anyRules.length >= 2) {
      throw new Error(`At most one [selection: "any"] rule can be provided.`);
    }
  
    // Place the 'any' rule last so it has higest priority.
    const orderedRules = [...nonAnyRules, ...anyRules];
  
    let rulePriority = 1;
    for (const rule of orderedRules) {
      result.rules.push(convertRule(rule, rulePriority));
      rulePriority++;
    }
  
    return result;
  }
  
  function convertRule(
    rule: pulumi.Unwrap<lifecyclePolicyRuleInputs>,
    rulePriority: number,
  ): aws.ecr.PolicyRule {
    return {
      rulePriority,
      description: rule.description,
      selection: { ...convertTag(), ...convertCount() },
      action: { type: "expire" },
    };
  
    function convertCount() {
      if (rule.maximumNumberOfImages !== undefined) {
        return {
          countType: "imageCountMoreThan",
          countNumber: rule.maximumNumberOfImages,
          countUnit: undefined,
        } as const;
      } else if (rule.maximumAgeLimit !== undefined) {
        return {
          countType: "sinceImagePushed",
          countNumber: rule.maximumAgeLimit,
          countUnit: "days",
        } as const;
      } else {
        throw new Error(
          "Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided with a rule.",
        );
      }
    }
  
    function convertTag() {
      if (rule.tagStatus === "any" || rule.tagStatus === "untagged") {
        return { tagStatus: rule.tagStatus };
      } else {
        if (!rule.tagPrefixList || rule.tagPrefixList.length === 0) {
          throw new Error("tagPrefixList cannot be empty.");
        }
  
        return {
          tagStatus: "tagged",
          tagPrefixList: rule.tagPrefixList,
        } as const;
      }
    }
  }
  

function config_getAll(): object {
    const config = pulumi.runtime.allConfig();
    const projConfig = Object.fromEntries(
        Object.entries(config)
            .filter(([key]) => key.startsWith("comp-as-comp:"))       // Keep keys that start with the prefix
            .map(([key, value]) => [key.slice("comp-as-comp:".length), value]) // Remove the prefix from the key
    );
    return { ...projConfig };
}
function config_getOutput(name: string): pulumi.Output<string> {
    // TODO: Do we have to lie about the nullability of the output?
    return pulumi.output(config.get(name)!);
}
function config_getBooleanOutput(name: string): pulumi.Output<boolean> {
    // TODO: Do we have to lie about the nullability of the output?
    return pulumi.output(config.getBoolean(name)!);
}
function config_getObjectOutput<T>(name: string): pulumi.Output<T> {
    const v = config.getObject<T>(name);
    // TODO: Do we have to lie about the nullability of the output?
    return pulumi.output(v) as pulumi.Output<T>;
}




// import * as tls from "tls-self-signed-cert";

// const cert = new tls.SelfSignedCertificate("mycert", {
//     subject: {},
//     dnsName: "example.com",
//     validityPeriodHours: 24,
//     localValidityPeriodHours: 24,
// });
// export const certPem = cert.pem;
