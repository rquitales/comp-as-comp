// Copyright 2016-2024, Pulumi Corporation.

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// This resource helps you create a Lambda function and API Gateway Rest API.
export class LambdaHttpApp extends pulumi.ComponentResource {
    // The https endpoint of the running Rest API
    public readonly endpoint: pulumi.Output<string>;

    constructor(name: string, args: LambdaHttpAppArgs, opts?: pulumi.ComponentResourceOptions) {
        super("platform:index:LambdaHttpApp", name, args, opts);

        // Give our Lambda access to the Dynamo DB table, CloudWatch Logs and Metrics.
        const role = new aws.iam.Role(`${name}-role`, {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
        }, { parent: this });

        const policyValue: pulumi.Input<string | aws.iam.PolicyDocument> = args.dynamoTableArn ? 
        pulumi.output({
            Version: "2012-10-17",
            Statement: [
                {
                Action: ["dynamodb:UpdateItem", "dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:DescribeTable"],
                Resource: args.dynamoTableArn,
                Effect: "Allow",
            }, 
            {
                Action: ["logs:*", "cloudwatch:*"],
                Resource: "*",
                Effect: "Allow",
            }],
        }) : pulumi.output({
            Version: "2012-10-17",
            Statement: [{
                Action: ["logs:*", "cloudwatch:*"],
                Resource: "*",
                Effect: "Allow",
            }],
        });

        const policy = new aws.iam.RolePolicy(`${name}-policy`, {
            role,
            policy: policyValue,
        }, { parent: this });

        // Create a Lambda function, using code from the `./app` folder.
        const lambda = new aws.lambda.Function(`${name}-func`, {
            runtime: "nodejs20.x",
            code: new pulumi.asset.AssetArchive({
                ".": pulumi.output(args.appFolder).apply(appFolder => new pulumi.asset.FileArchive(appFolder)),
            }),
            timeout: 300,
            handler: args.entryPoint,
            role: role.arn,
            publish: true,
            // environment: {
            //     variables: {
            //         "COUNTER_TABLE": counterTable.name,
            //     },
            // },
        }, { dependsOn: [policy],  parent: this });

        // Create the API Gateway Rest API, using a swagger spec.
        const restApi = new aws.apigateway.RestApi(`${name}-api`, {
            body: lambda.arn.apply(lambdaArn => swaggerSpec(lambdaArn)),
        }, { parent: this });

        // Create a deployment of the Rest API.
        const deployment = new aws.apigateway.Deployment(`${name}-deployment`, {
            restApi: restApi,
        }, { parent: restApi });

        // Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
        const stage = new aws.apigateway.Stage(`${name}-stage`, {
            restApi: restApi,
            deployment: deployment,
            stageName: "api",
        }, { parent: restApi });

        // Give permissions from API Gateway to invoke the Lambda
        const invokePermission = new aws.lambda.Permission(`${name}-permission`, {
            action: "lambda:invokeFunction",
            function: lambda,
            principal: "apigateway.amazonaws.com",
            sourceArn: pulumi.interpolate `${deployment.executionArn}*/*`,
        }, { parent: lambda });

        // Export the https endpoint of the running Rest API
        this.endpoint = pulumi.interpolate `${deployment.invokeUrl}api`;
    }
}

// Export the LambdaHttpAppArgs interface which defines the required arguments for creating a Lambda HTTP app
export interface LambdaHttpAppArgs {
    // The folder containing the Lambda function code.
    appFolder: pulumi.Input<string>;
    // The entry point for the Lambda function.
    entryPoint: pulumi.Input<string>;
    // The ARN of the DynamoDB table to grant access to.
    dynamoTableArn?: pulumi.Input<string>;
}

// Create the Swagger spec for a proxy which forwards all HTTP requests through to the Lambda function.
function swaggerSpec(lambdaArn: string): string {
    const swaggerSpec = {
        swagger: "2.0",
        info: { title: "api", version: "1.0" },
        paths: {
            "/{proxy+}": swaggerRouteHandler(lambdaArn),
        },
    };
    return JSON.stringify(swaggerSpec);
}

// Create a single Swagger spec route handler for a Lambda function.
function swaggerRouteHandler(lambdaArn: string) {
    const region = aws.config.requireRegion();
    return {
        "x-amazon-apigateway-any-method": {
            "x-amazon-apigateway-integration": {
                uri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
                passthroughBehavior: "when_no_match",
                httpMethod: "POST",
                type: "aws_proxy",
            },
            // Add these fields to allow public access
            "security": [],
            "responses": {},
            "authorizationType": "NONE"
        },
    };
}
