import * as ts from "typescript";
import * as path from "path";

type SchemaProperty = {
    type: string;
    optional?: boolean;
    description?: string;
};

type ComponentSchema = {
    inputs: Record<string, SchemaProperty>;
    outputs: Record<string, SchemaProperty>;
};

type AnalyzedComponents = Record<string, ComponentSchema>;

export class ComponentAnalyzer {
    private checker: ts.TypeChecker;
    private program: ts.Program;

    constructor() {
        const configPath = "./tsconfig.json";
        const config = ts.readConfigFile(configPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
            config.config,
            ts.sys,
            path.dirname(configPath)
        );
        
        this.program = ts.createProgram({
            rootNames: parsedConfig.fileNames,
            options: parsedConfig.options,
        });
        this.checker = this.program.getTypeChecker();
    }

    public analyzeComponents(): AnalyzedComponents {
        const components: AnalyzedComponents = {};

        // Iterate through all source files
        this.program.getSourceFiles().forEach(sourceFile => {
            // Skip node_modules and declaration files
            if (sourceFile.fileName.includes('node_modules') || 
                sourceFile.fileName.endsWith('.d.ts')) {
                return;
            }

            console.log(`Analyzing file: ${sourceFile.fileName}`);
            this.findComponentsInFile(sourceFile, components);
        });

        return components;
    }

    private findComponentsInFile(sourceFile: ts.SourceFile, components: AnalyzedComponents) {
        // Find all class declarations in the file
        const visit = (node: ts.Node) => {
            if (ts.isClassDeclaration(node) && node.name && this.isPulumiComponent(node)) {
                const componentName = node.name.text;
                console.log(`Found component: ${componentName}`);
                
                components[componentName] = {
                    inputs: {},
                    outputs: {}
                };

                this.analyzeComponentClass(node, components[componentName], sourceFile);
                
                // Look for the corresponding Args interface
                const argsInterfaceName = `${componentName}Args`;
                this.findAndAnalyzeArgsInterface(sourceFile, argsInterfaceName, components[componentName]);
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
    }

    private isPulumiComponent(node: ts.ClassDeclaration): boolean {
        if (!node.heritageClauses) return false;

        return node.heritageClauses.some(clause => {
            return clause.types.some(type => {
                const text = type.expression.getText();
                return text.includes('ComponentResource') || text.includes('pulumi.ComponentResource');
            });
        });
    }

    private findAndAnalyzeArgsInterface(sourceFile: ts.SourceFile, argsInterfaceName: string, schema: ComponentSchema) {
        const visit = (node: ts.Node) => {
            if (ts.isInterfaceDeclaration(node) && node.name.text === argsInterfaceName) {
                console.log(`Found args interface: ${argsInterfaceName}`);
                this.analyzeArgsInterface(node, schema);
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
    }

    private getJSDocComment(node: ts.Node): string | undefined {
        console.log(`Debug JSDoc - Node kind: ${ts.SyntaxKind[node.kind]}`);
    
        // Get full text including comments
        const nodeFullText = node.getFullText();
        const commentRanges = ts.getLeadingCommentRanges(nodeFullText, 0);
        
        if (commentRanges) {
            console.log(`Debug JSDoc - Found ${commentRanges.length} comment ranges`);
            const comments = commentRanges
                .map(range => {
                    const text = nodeFullText.slice(range.pos, range.end);
                    console.log(`Debug JSDoc - Raw comment: "${text}"`);
                    return text;
                })
                .map(text => {
                    if (text.startsWith('/**')) {
                        // Clean up JSDoc style
                        return text.replace(/\/\*\*|\*\/|\* ?/g, '').trim();
                    } else if (text.startsWith('//')) {
                        // Clean up single-line comment style
                        return text.replace(/\/\/ ?/g, '').trim();
                    }
                    return text.trim();
                })
                .filter(text => text.length > 0);
            
            if (comments.length > 0) {
                return comments[0];
            }
        }
    
        return undefined;
    }

    private analyzeArgsInterface(node: ts.InterfaceDeclaration, schema: ComponentSchema) {
        node.members.forEach(member => {
            if (ts.isPropertySignature(member)) {
                const propName = member.name.getText();
                const propType = this.checker.getTypeAtLocation(member);
                const optional = !!(member.questionToken);
                const description = this.getJSDocComment(member);

                console.log(`Found input property: ${propName} (${this.getPulumiType(propType)}, optional: ${optional})`);
                if (description) console.log(`Description: ${description}`);

                schema.inputs[propName] = {
                    type: this.getPulumiType(propType),
                    optional,
                    ...(description && { description })
                };
            }
        });
    }

    private analyzeComponentClass(node: ts.ClassDeclaration, schema: ComponentSchema, sourceFile: ts.SourceFile) {
        const classType = this.checker.getTypeAtLocation(node);
        const properties = this.checker.getPropertiesOfType(classType);
        
        properties.forEach(prop => {
            if (prop.flags & ts.SymbolFlags.Method) return;
            
            const declarations = prop.declarations;
            if (!declarations || declarations.length === 0) return;
            
            const declaration = declarations[0];
            const propType = this.checker.getTypeOfSymbolAtLocation(prop, declaration);
            const typeString = this.checker.typeToString(propType);
            
            if (this.isPulumiOutput(propType)) {
                const description = this.getJSDocComment(declaration);
                console.log(`Found output property: ${prop.name} (${this.getPulumiType(propType)})`);
                if (description) console.log(`Description: ${description}`);

                schema.outputs[prop.name] = {
                    type: this.getPulumiType(propType),
                    ...(description && { description })
                };
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
        return typeString.includes('Output<') || typeString.includes('OutputInstance<');
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

        return typeString.toLowerCase();
    }
}
