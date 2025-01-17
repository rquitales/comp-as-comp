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
				"go": map[string]any{
					"generateResourceContainerTypes": true,
					"respectSchemaVersion":           true,
				},
				"python": map[string]any{
					"requires": map[string]any{
						"pulumi":        ">=3.0.0,<4.0.0",
						"pulumi_random": ">=4.0.0,<5.0.0",
					},
					"respectSchemaVersion": true,
				},
				"csharp": map[string]any{
					"packageReferences": map[string]any{
						"Pulumi":        "3.*",
						"Pulumi.Random": "4.*",
					},
					"respectSchemaVersion": true,
				},
			},
		},
	})
}

func main() {
	p.RunProvider("go-components", "0.1.0", Provider())
}
