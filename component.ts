import * as pulumi from "@pulumi/pulumi";

class MyComponent extends pulumi.ComponentResource {
    // Output 1 comment.
    public readonly output1: pulumi.Output<string>;
    // Output 2 comment.
    public readonly output2: pulumi.Output<number>;
    
    constructor(name: string, args: MyComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("my:component:MyComponent", name, {}, opts);
        this.output1 = pulumi.output(args.input1);
        this.output2 = pulumi.output(args.input2).apply(x => x ?? 0);
    }
}

interface MyComponentArgs {
    /** The primary input string that will be processed */
    input1: pulumi.Input<string>;
    // Input 2 comment.
    input2?: pulumi.Input<number>;
}
