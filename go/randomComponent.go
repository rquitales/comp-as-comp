package main

import (
	"github.com/pulumi/pulumi-go-provider/infer"
	"github.com/pulumi/pulumi-random/sdk/v4/go/random"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type RandomComponent struct{}

type RandomComponentArgs struct {
	Length pulumi.IntInput `pulumi:"length"`
}

type RandomComponentState struct {
	pulumi.ResourceState
	RandomComponentArgs
	Password pulumi.StringOutput `pulumi:"password"`
}

func (r *RandomComponent) Construct(ctx *pulumi.Context, name, typ string, args RandomComponentArgs, opts pulumi.ResourceOption) (*RandomComponentState, error) {
	comp := &RandomComponentState{
		RandomComponentArgs: args,
	}
	err := ctx.RegisterComponentResource(typ, name, comp, opts)
	if err != nil {
		return nil, err
	}

	pArgs := &random.RandomPasswordArgs{
		Length: args.Length,
	}

	config := infer.GetConfig[Config](ctx.Context())
	if config.Scream != nil {
		pArgs.Lower = pulumi.BoolPtr(*config.Scream)
	}

	password, err := random.NewRandomPassword(ctx, name+"-password", pArgs, pulumi.Parent(comp))
	if err != nil {
		return nil, err
	}

	comp.Password = password.Result
	return comp, nil
}
