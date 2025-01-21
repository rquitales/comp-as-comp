"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchema = void 0;
const analyzer = __importStar(require("./analyzer"));
function generateComponent(pkg, component) {
    const result = {
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
        result.inputProperties[propName] = prop;
    }
    for (const output in component.outputs) {
        const outputSchema = component.outputs[output];
        result.properties[output] = {
            description: outputSchema.description,
            type: outputSchema.type,
        };
        if (!outputSchema.optional) {
            result.required.push(output);
        }
    }
    return result;
}
function generateSchema(pack, path) {
    const result = {
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
        result.resources[tok] = generateComponent(pack.name, components[component]);
        for (const type in components[component].typeDefinitions) {
            const typeDef = components[component].typeDefinitions[type];
            const typ = {
                type: "object",
                properties: typeDef.properties,
                required: Object.keys(typeDef.properties).filter((k) => !typeDef.properties[k].optional),
            };
            for (const propName in typeDef.properties) {
                const prop = generateProperty(pack.name, typeDef.properties[propName]);
                typ.properties[propName] = prop;
            }
            result.types[`${pack.name}:index:${type}`] = typ;
        }
    }
    return result;
}
exports.generateSchema = generateSchema;
function generateProperty(pkg, inputSchema) {
    let type = inputSchema.type;
    let items = undefined;
    let ref = undefined;
    if (inputSchema.ref) {
        ref = `#/types/${pkg}:index:${inputSchema.ref}`;
    }
    else if (inputSchema.type === "array" && inputSchema.items) {
        // Handle array with items definition
        if (inputSchema.items.ref) {
            items = { $ref: `#/types/${pkg}:index:${inputSchema.items.ref}` };
        }
        else if (inputSchema.items.type) {
            items = { type: inputSchema.items.type };
        }
    }
    else if (type && type.endsWith("[]")) {
        // Handle legacy array format
        items = { type: type.slice(0, -2) };
        type = "array";
    }
    return {
        description: inputSchema.description,
        type: type,
        items: items,
        $ref: ref,
    };
}
//# sourceMappingURL=schema.js.map