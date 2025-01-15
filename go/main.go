package main

import (
	p "github.com/pulumi/pulumi-go-provider"
	"github.com/pulumi/pulumi-go-provider/infer"
	"github.com/pulumi/pulumi-go-provider/middleware/schema"
)

func Provider() p.Provider {
	return infer.Provider(infer.Options{
		Components: []infer.InferredComponent{
			infer.Component[*RandomComponent, RandomComponentArgs, *RandomComponentState](),
		},
		Metadata: schema.Metadata{
			LanguageMap: map[string]any{
				"nodejs": map[string]any{
					"dependencies": map[string]any{
						"@pulumi/random": "^4.16.8",
					},
					"respectSchemaVersion": true,
				},
			},
		},
	})
}

func main() {
	p.RunProvider("random-component", "0.1.0", Provider())
}
