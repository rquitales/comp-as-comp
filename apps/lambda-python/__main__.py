"""A Python Pulumi program"""

import pulumi_platform as platform

mytable = platform.DynamoTable("table")

platform.LambdaHttpApp("app", 
    app_folder=".",
    entry_point="index.handler",
    dynamo_table_arn=mytable.arn)
