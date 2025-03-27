package main

import (
	"github.com/pulumi/pulumi-go-provider/infer"
)

func main() {
	err := infer.NewProviderBuilder().
		WithName("go-components").
		WithNamespace("mikhailshilkov").
		WithComponents(
			infer.Component(NewRandomComponent),
			infer.Component(NewStaticPage),
		).
		BuildAndRun()

	if err != nil {
		panic(err)
	}
}
