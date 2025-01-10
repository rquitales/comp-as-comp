# Source-based Pulumi Component Authoring

This repository contains examples of how to author Pulumi components using source-based sharing mechanism. It means that the component's source code is published on GitHub and any Pulumi program can consume it using the `pulumi package add github.com/mikhailshilkov/comp-as-comp/<component-name>` command.

The examples are work-in-progress and will be updated over time as the core Pulumi functionality evolves.

## pulumi-ts-provider

A very early prototype of a high-level provider authoring library for TypeScript comparable to `pulumi-go-provider` for Go. Includes automatic schema inference from the component's source code.

## Examples

### TypeScript

The `ts` directory contains a simple TypeScript component that creates a TLS self-signed certificate. It illustrates a forward-looking approach where a bunch of machinery is abstracted away, currently into the `pulumi-ts-provider` folder. The `example` folder contains a Pulumi YAML program that consumes the component.

### Python

The `py` directory contains a simple Python component that creates an AWS Static Page component. The `example` folder contains a Pulumi YAML program that consumes the component. Note that the CLI currently lacks the ability to install a virtual environment for the component provider, so it may not work out of the box yet.

### Go

The `go` directory contains a simple Go component that creates a sample Random component. The `example` folder contains a Pulumi YAML program that consumes the component. It's currently required to build the component with `go build` before it can be used.

### .NET

The `dotnet` directory contains a simple .NET component that creates a sample Random component. The `example` folder contains a Pulumi YAML program that consumes the component. 

## Platform Demo

The `platform` and `apps` folder contain a demo that I've been showing to some customers. It's another example of a TypeScript component consumed from YAML and Python programs. The component is entirely "pure" local ComponentResource with no provider implementation, so a custom branch `mikhailshilkov/runplugin-components` of the Pulumi Node runtime is required to run it.
