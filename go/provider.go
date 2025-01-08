package main

import (
	p "github.com/pulumi/pulumi-go-provider"
	"github.com/pulumi/pulumi-go-provider/infer"
	"github.com/pulumi/pulumi/sdk/v3/go/common/tokens"
)

// Version is initialized by the Go linker to contain the semver of this build.
var Version string

const Name string = "random-component"

func Provider() p.Provider {
	return infer.Provider(infer.Options{
		Components: []infer.InferredComponent{
			infer.Component[*RandomComponent, RandomComponentArgs, *RandomComponentState](),
		},
		Config: infer.Config[Config](),
		ModuleMap: map[tokens.ModuleName]tokens.ModuleName{
			"provider": "index",
		},
	})
}

// Define some provider-level configuration
type Config struct {
	Scream *bool `pulumi:"itsasecret,optional"`
}
