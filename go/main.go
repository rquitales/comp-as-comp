package main

import (
	"github.com/pulumi/pulumi-go-provider/infer"
)

func main() {
	infer.NewProviderBuilder().
		WithComponents(infer.Component(NewRandomComponent)).
		WithName("go-components").
		WithVersion("0.1.0").
		BuildAndRun()
}
