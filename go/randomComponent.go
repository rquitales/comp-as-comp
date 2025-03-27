package main

import (
	"github.com/pulumi/pulumi-random/sdk/v4/go/random"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type RandomComponentArgs struct {
	Length pulumi.IntInput `pulumi:"length"`
}

type RandomComponent struct {
	pulumi.ResourceState
	RandomComponentArgs
	Password pulumi.StringOutput `pulumi:"password"`
}

func NewRandomComponent(ctx *pulumi.Context, name string, args RandomComponentArgs, opts ...pulumi.ResourceOption) (*RandomComponent, error) {
	comp := &RandomComponent{
		RandomComponentArgs: args,
	}
	err := ctx.RegisterComponentResource("pkg:index:RandomComponent", name, comp, opts...)
	if err != nil {
		return nil, err
	}

	pArgs := &random.RandomPasswordArgs{
		Length: args.Length,
	}

	password, err := random.NewRandomPassword(ctx, name+"-password", pArgs, pulumi.Parent(comp))
	if err != nil {
		return nil, err
	}

	comp.Password = password.Result
	return comp, nil
}
