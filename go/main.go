package main

import (
	p "github.com/pulumi/pulumi-go-provider"
	"github.com/pulumi/pulumi-go-provider/infer"
)

func Provider() p.Provider {
	return infer.Provider(infer.Options{
		Components: []infer.InferredComponent{
			infer.Component[*RandomComponent, RandomComponentArgs, *RandomComponentState](),
		},
	})
}

func main() {
	p.RunProvider("random-component", "0.1.0", Provider())
}
