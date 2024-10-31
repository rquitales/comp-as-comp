import * as ts from "typescript";
import * as path from "path";

type SchemaProperty = {
    type: string;
    optional?: boolean;
};

type ComponentSchema = {
    inputs: Record<string, SchemaProperty>;
    outputs: Record<string, SchemaProperty>;
};

class ComponentAnalyzer {
    private checker: ts.TypeChecker;
    private program: ts.Program;

    constructor() {
        const tsConfigPath = './tsconfig.json';
        const config = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
            config.config,
            ts.sys,
            path.dirname(tsConfigPath)
        );
        
        this.program = ts.createProgram({
            rootNames: parsedConfig.fileNames,
            options: parsedConfig.options,
        });
        this.checker = this.program.getTypeChecker();
    }

    public analyzeComponent(componentPath: string): ComponentSchema {       
        const schema: ComponentSchema = {
            inputs: {},
            outputs: {}
        };

        const sourceFile = this.program.getSourceFile(componentPath);
        if (!sourceFile) {
            throw new Error(`Could not find source file: ${componentPath}`);
        }

        ts.forEachChild(sourceFile, (node) => {
            if (ts.isClassDeclaration(node)) {
                console.log('Found component class:', node.name?.text);
                this.analyzeComponentClass(node, schema);
            }
        });

        return schema;
    }

    private analyzeComponentClass(node: ts.ClassDeclaration, schema: ComponentSchema) {
        // Analyze constructor args
        const constructor = node.members.find(ts.isConstructorDeclaration);
        if (constructor && constructor.parameters.length > 1) {
            const argsParam = constructor.parameters[1];
            const argsType = this.checker.getTypeAtLocation(argsParam);
            
            console.log('Analyzing inputs from constructor args type:', this.checker.typeToString(argsType));
            
            argsType.getProperties().forEach(prop => {
                const propType = this.checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
                const optional = !!(prop.flags & ts.SymbolFlags.Optional);
                console.log(`Found input property: ${prop.name} of type ${this.getPulumiType(propType)} (optional: ${optional})`);
                
                schema.inputs[prop.name] = {
                    type: this.getPulumiType(propType),
                    optional: optional
                };
            });
        }

        // Get the type of the class itself
        const classType = this.checker.getTypeAtLocation(node);
        const properties = this.checker.getPropertiesOfType(classType);
        console.log(`Found ${properties.length} properties on class`);
        
        properties.forEach(prop => {
            if (prop.flags & ts.SymbolFlags.Method) return;
            
            const declaration = prop.valueDeclaration || prop.declarations?.[0];
            if (!declaration) return;
            
            const propType = this.checker.getTypeOfSymbolAtLocation(prop, declaration);
            const typeString = this.checker.typeToString(propType);
            console.log(`Analyzing property ${prop.name} of type ${typeString}`);
            
            if (this.isPulumiOutput(propType)) {
                schema.outputs[prop.name] = {
                    type: this.getPulumiType(propType)
                };
                console.log(`Added output property: ${prop.name} of type ${this.getPulumiType(propType)}`);
            }
        });

        // Filter out internal Pulumi properties
        const internalProps = ['urn', 'id'];
        internalProps.forEach(prop => {
            delete schema.outputs[prop];
        });
    }

    private isPulumiOutput(type: ts.Type): boolean {
        const typeString = this.checker.typeToString(type);
        const isOutput = typeString.includes('Output<') || typeString.includes('OutputInstance<');
        console.log(`Checking if ${typeString} is Output: ${isOutput}`);
        return isOutput;
    }

    private getPulumiType(type: ts.Type): string {
        const typeString = this.checker.typeToString(type);
        
        // Handle both Output<T> and OutputInstance<T>
        const match = typeString.match(/(?:Output|OutputInstance)<(.+)>/);
        if (match) {
            return match[1].toLowerCase();
        }

        // Handle Input<T>
        const inputMatch = typeString.match(/Input<(.+)>/);
        if (inputMatch) {
            return inputMatch[1].toLowerCase();
        }

        // Handle primitive types
        return typeString.toLowerCase();
    }
}

const schema = new ComponentAnalyzer().analyzeComponent('./component.ts');
console.log('Final Schema:', JSON.stringify(schema, null, 2));

// Prints:
// {
//     "inputs": {
//       "input1": {
//         "type": "string",
//         "optional": false
//       },
//       "input2": {
//         "type": "number",
//         "optional": true
//       }
//     },
//     "outputs": {
//       "output1": {
//         "type": "string"
//       },
//       "output2": {
//         "type": "number"
//       }
//     }
// }