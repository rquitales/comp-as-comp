import * as pulumi from "@pulumi/pulumi";

class MyComponent extends pulumi.ComponentResource {
    public readonly output1: pulumi.Output<string>;
    public readonly output2: pulumi.Output<number>;
    
    constructor(name: string, args: MyComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("my:component:MyComponent", name, {}, opts);
        this.output1 = pulumi.output(args.input1);
        this.output2 = pulumi.output(args.input2).apply(x => x ?? 0);
    }
}

interface MyComponentArgs {
    input1: pulumi.Input<string>;
    input2?: pulumi.Input<number>;
}
