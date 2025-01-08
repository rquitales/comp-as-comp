package main

import (
	p "github.com/pulumi/pulumi-go-provider"
)

func main() { p.RunProvider(Name, Version, Provider()) }
