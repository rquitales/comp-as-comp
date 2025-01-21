import * as analyzer from "./analyzer";
import * as schema from "./schemaSpec";

interface PropertySchema {
    description?: string;
    type?: string;
    willReplaceOnChanges?: boolean;
    items?: { type: string }; // For arrays
    $ref?: string; // For references to other schemas
}

interface ResourceSchema {
    isComponent: boolean;
    description?: string;
    inputProperties: {
        [propertyName: string]: PropertySchema;
    };
    requiredInputs: string[];
    properties: {
        [propertyName: string]: PropertySchema;
    };
    required: string[];
}

interface TypeSchema {
    type: "object";
    properties: {
        [propertyName: string]: PropertySchema;
    };
    required: string[];
}

interface LanguageSchema {
    [language: string]: {
        dependencies?: { [packageName: string]: string };
        devDependencies?: { [packageName: string]: string };
        respectSchemaVersion?: boolean;
    };
}

interface Schema {
    name: string;
    displayName: string;
    version: string;
    resources: {
        [resourceName: string]: ResourceSchema;
    };
    types: {
        [typeName: string]: TypeSchema;
    };
    language: LanguageSchema;
}


function generateComponent(pkg: string, component: analyzer.ComponentSchema): schema.ResourceDefinition {
    const result: schema.ResourceDefinition = {
        isComponent: true,
        description: component.description,
        inputProperties: {},
        requiredInputs: Object.keys(component.inputs).filter((k) => !component.inputs[k].optional),
        properties: {},
        required: [],
    };
    for (const propName in component.inputs) {
        const inputProp = component.inputs[propName];
        const prop = generateProperty(pkg, inputProp);
        result.inputProperties![propName] = prop;
    }
    for (const output in component.outputs) {
        const outputSchema = component.outputs[output];
        result.properties![output] = {
            description: outputSchema.description,
            type: outputSchema.type,
        };
        if (!outputSchema.optional) {
            result.required!.push(output);
        }
    }
    return result;
}

export function generateSchema(pack: any, path: string): schema.PulumiPackage {
    const result: schema.PulumiPackage = {
        name: pack.name,
        displayName: pack.description,
        version: pack.version,
        resources: {},
        types: {},
        language: {
            nodejs: {
                dependencies: {},
                devDependencies: {
                    "typescript": "^3.7.0",
                },
                respectSchemaVersion: true,
            },
            python: {
                respectSchemaVersion: true,
            },
            csharp: {
                respectSchemaVersion: true,
            },
            go: {
                respectSchemaVersion: true,
            },
        },
    };
    const components = new analyzer.ComponentAnalyzer(path).analyzeComponents();    
    for (const component in components) {
        const tok = `${pack.name}:index:${component}`;
        result.resources![tok] = generateComponent(pack.name, components[component]);
        for (const type in components[component].typeDefinitions) {
            const typeDef = components[component].typeDefinitions[type];
            const typ: schema.TypeDefinition = {
                type: "object",
                properties: typeDef.properties as Record<string, schema.PropertyDefinition>,
                required: Object.keys(typeDef.properties).filter((k) => !typeDef.properties[k].optional),
            };
            for (const propName in typeDef.properties) {
                const prop = generateProperty(pack.name, typeDef.properties[propName]);
                typ.properties![propName] = prop;
            }
            result.types![`${pack.name}:index:${type}`] = typ;
        }
    }
    return result;
}

function generateProperty(pkg: string, inputSchema: analyzer.SchemaProperty): schema.PropertyDefinition {
    let type = inputSchema.type;
    let items: schema.TypeDefinition | undefined = undefined;
    let ref = undefined;
    let additionalProperties = undefined;

    if (inputSchema.ref) {
        ref = `#/types/${pkg}:index:${inputSchema.ref}`;
    } else if (inputSchema.type === "array" && inputSchema.items) {
        // Handle array with items definition
        if (inputSchema.items.ref) {
            items = { $ref: `#/types/${pkg}:index:${inputSchema.items.ref}` };
        } else if (inputSchema.items.type) {
            items = { type: inputSchema.items.type as schema.Type };
        }
    } else if (type && type.endsWith("[]")) {
        // Handle legacy array format
        items = { type: type.slice(0, -2) as schema.Type };
        type = "array";
    }

    // Handle dictionary/map types
    if (inputSchema.additionalProperties) {
        if ('ref' in inputSchema.additionalProperties) {
            additionalProperties = { $ref: `#/types/${pkg}:index:${inputSchema.additionalProperties.ref}` };
        } else if ('type' in inputSchema.additionalProperties) {
            additionalProperties = { type: inputSchema.additionalProperties.type as schema.Type };
        }
    }

    return {
        description: inputSchema.description,
        type: type,
        items: items,
        $ref: ref,
        additionalProperties: additionalProperties,
    };
}