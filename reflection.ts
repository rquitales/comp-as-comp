import "reflect-metadata";
import * as pulumi from "@pulumi/pulumi";

type SchemaProperty = {
    type: string;
    optional?: boolean;
};

type ComponentSchema = {
    inputs: Record<string, SchemaProperty>;
    outputs: Record<string, SchemaProperty>;
};

// Store output property names during decoration
const OUTPUT_PROPERTIES_KEY = "pulumiOutputProperties";

// Class decorator to store schema information
function PulumiComponent(inputSchema: Record<string, SchemaProperty>) {
    return function (target: any) {
        Reflect.defineMetadata("pulumiInputs", inputSchema, target);
        return target;
    };
}

// Property decorator for outputs
function PulumiOutput(type: string) {
    return function(target: any, propertyKey: string) {
        // Store the output type
        Reflect.defineMetadata("pulumiOutput", type, target, propertyKey);
        
        // Store the property name in a list of output properties
        const existingProps = Reflect.getMetadata(OUTPUT_PROPERTIES_KEY, target) || [];
        if (!existingProps.includes(propertyKey)) {
            Reflect.defineMetadata(OUTPUT_PROPERTIES_KEY, [...existingProps, propertyKey], target);
        }
        
        console.log(`Debug: Decorated output property ${propertyKey} with type ${type}`);
    }
}

function inspectComponentSchema(componentClass: new (...args: any[]) => pulumi.ComponentResource): ComponentSchema {
    console.log('Debug: Starting schema inspection');
    
    const schema: ComponentSchema = {
        inputs: {},
        outputs: {}
    };

    // Get inputs from the class decorator
    const inputSchema = Reflect.getMetadata("pulumiInputs", componentClass);
    console.log('Debug: Found input schema:', inputSchema);
    if (inputSchema) {
        schema.inputs = inputSchema;
    }

    // Get the list of output properties
    const prototype = componentClass.prototype;
    const outputProps = Reflect.getMetadata(OUTPUT_PROPERTIES_KEY, prototype) || [];
    console.log('Debug: Found output properties:', outputProps);
    
    // Get outputs from the stored property list
    for (const prop of outputProps) {
        const outputType = Reflect.getMetadata("pulumiOutput", prototype, prop);
        console.log(`Debug: Found output ${prop} with type ${outputType}`);
        
        if (outputType) {
            schema.outputs[prop] = {
                type: outputType
            };
        }
    }

    return schema;
}

@PulumiComponent({
    input1: { type: "string" },
    input2: { type: "number" }
})
class MyComponent extends pulumi.ComponentResource {
    @PulumiOutput("string")
    public output1!: pulumi.Output<string>;
    
    @PulumiOutput("number")
    public output2!: pulumi.Output<number>;

    constructor(name: string, args: MyComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("my:component:MyComponent", name, {}, opts);
    }
}

interface MyComponentArgs {
    input1: pulumi.Input<string>;
    input2: pulumi.Input<number>;
}

// Usage
export const schema = inspectComponentSchema(MyComponent);
console.log('\nFinal Component Schema:');
console.log(JSON.stringify(schema, null, 2));