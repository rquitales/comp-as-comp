// Copyright 2016-2024, Pulumi Corporation.

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class DynamoTable extends pulumi.ComponentResource {
    public readonly arn: pulumi.Output<string>;
    constructor(name: string, args: DynamoTableArgs, opts?: pulumi.ComponentResourceOptions) {
        super("platform:index:DynamoTable", name, args, opts);

        // A DynamoDB table with a single primary key
        const table = new aws.dynamodb.Table("table", {
            attributes: [
                { name: "Id", type: "S" },
            ],
            hashKey: "Id",
            readCapacity: 1,
            writeCapacity: 1,
        }, { parent: this });

        this.arn = table.arn;
    }
}

// Export the LambdaHttpAppArgs interface which defines the required arguments for creating a Lambda HTTP app
export interface DynamoTableArgs {
}