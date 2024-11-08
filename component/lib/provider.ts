// Copyright 2016-2024, Pulumi Corporation.

import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as provider from "@pulumi/pulumi/provider";
import { generateSchema, Schema } from "./schema";
import { ComponentInstantiator } from "./instantiator";

type OutputsToInputs<T> = {
    [K in keyof T]: T[K] extends pulumi.Output<infer U> ? pulumi.Input<U> : never;
};

function getInputsFromOutputs<T extends pulumi.ComponentResource>(resource: T): OutputsToInputs<T> {
    const result: any = {};
    for (const key of Object.keys(resource)) {
        const value = resource[key as keyof T];
        if (pulumi.Output.isInstance(value)) {
            result[key] = value;
        }
    }
    return result as OutputsToInputs<T>;
}

class ComponentProvider implements provider.Provider {
    schema: string;
    path: string;
    constructor(readonly version: string) {
        this.schema = "";
        this.path = "";
    }

    async construct(name: string, type: string, inputs: pulumi.Inputs,
        options: pulumi.ComponentResourceOptions): Promise<provider.ConstructResult> {
        if (this.path === "") {
            throw new Error("parameterize must be called before construct");
        }

        const instantiator = new ComponentInstantiator(this.path);
        const className = type.split(":")[2];
        const comp = await instantiator.instantiateComponent(className, inputs);
        return {
            urn: comp.urn,
            state: getInputsFromOutputs(comp),
        }
    }

    async parameterize(dir: string): Promise<pulumi.provider.ParameterizeResult> {
        const absDir = path.resolve(dir)
        const packStr = readFileSync(`${absDir}/package.json`, {encoding: "utf-8"});
        const pack = JSON.parse(packStr);    
        const schema = generateSchema(pack, absDir);
        schema.parameterization = {
            baseProvider: {
                name: "component",
                version: this.version,
            },
            parameter: Buffer.from(absDir, 'utf-8').toString('base64'),
        };
        this.schema = JSON.stringify(schema);
        this.path = absDir;
        return {
            name: schema.name,
            version: schema.version,
        };
    }
}

export function componentProviderHost() {
    const args = process.argv.slice(2);
    const packStr = readFileSync("./package.json", {encoding: "utf-8"});
    const pack = JSON.parse(packStr);

    if (args.length === 1 && args[0] === "--gen") {
        const schema = generateSchema(pack, ".");
        writeFileSync("./schema.json", JSON.stringify(schema, null, 4));
        return;
    }

    const prov = new ComponentProvider(pack.version);
    return pulumi.provider.main(prov, args);
}