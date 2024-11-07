import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

export class ComponentInstantiator {
    private program: ts.Program;
    private checker: ts.TypeChecker;
    
    constructor(folderPath: string) {
        // Ensure the folder exists
        if (!fs.existsSync(folderPath)) {
            throw new Error(`Folder does not exist: ${folderPath}`);
        }

        // Create a minimal tsconfig if none exists in the folder
        const tsConfigPath = path.join(folderPath, 'tsconfig.json');
        let compilerOptions: ts.CompilerOptions;

        if (fs.existsSync(tsConfigPath)) {
            const config = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
            const parsedConfig = ts.parseJsonConfigFileContent(
                config.config,
                ts.sys,
                path.dirname(tsConfigPath)
            );
            compilerOptions = parsedConfig.options;
        } else {
            compilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.CommonJS,
                moduleResolution: ts.ModuleResolutionKind.NodeJs,
                esModuleInterop: true,
                skipLibCheck: true,
                strict: true,
            };
        }

        // Find all TypeScript files in the folder
        const fileNames = this.getTypeScriptFiles(folderPath);
        
        this.program = ts.createProgram({
            rootNames: fileNames,
            options: compilerOptions,
        });
        this.checker = this.program.getTypeChecker();
    }

    private getTypeScriptFiles(dir: string): string[] {
        const files: string[] = [];
        
        const readDir = (currentDir: string) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory() && !entry.name.includes('node_modules')) {
                    readDir(fullPath);
                } else if (entry.isFile() && 
                         (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && 
                         !entry.name.endsWith('.d.ts')) {
                    files.push(fullPath);
                }
            }
        };

        readDir(dir);
        return files;
    }

    public async instantiateComponent(componentName: string, args: Record<string, any>): Promise<any> {
        const componentInfo = this.findComponentClass(componentName);
        
        if (!componentInfo) {
            throw new Error(`Component ${componentName} not found`);
        }

        const { sourceFile, classDeclaration } = componentInfo;

        // Dynamically import the module
        const modulePath = sourceFile.fileName;
        try {
            const module = await import(modulePath);
            
            // Get the component class from the module
            const ComponentClass = module[componentName];
            if (!ComponentClass) {
                throw new Error(`Component class ${componentName} not found in module ${modulePath}`);
            }

            // Create a new instance with the provided args
            const componentInstance = new ComponentClass(`${componentName.toLowerCase()}-1`, args);
            
            return componentInstance;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to instantiate component ${componentName}: ${errorMessage}`);
        }
    }

    private findComponentClass(componentName: string): { sourceFile: ts.SourceFile, classDeclaration: ts.ClassDeclaration } | null {
        let result: { sourceFile: ts.SourceFile, classDeclaration: ts.ClassDeclaration } | null = null;

        const visit = (node: ts.Node, sourceFile: ts.SourceFile) => {
            if (ts.isClassDeclaration(node) && 
                node.name?.text === componentName && 
                this.isPulumiComponent(node)) {
                result = { sourceFile, classDeclaration: node };
                return;
            }
            ts.forEachChild(node, n => visit(n, sourceFile));
        };

        for (const sourceFile of this.program.getSourceFiles()) {
            if (!sourceFile.fileName.includes('node_modules') && !sourceFile.fileName.endsWith('.d.ts')) {
                visit(sourceFile, sourceFile);
                if (result) break;
            }
        }

        return result;
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
}

// Example usage:
/*
const instantiator = new ComponentInstantiator("./src/components");
const component = await instantiator.instantiateComponent("MyComponent", {
    param1: "value1",
    param2: "value2"
});
*/