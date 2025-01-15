using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.Experimental.Provider;
using Pulumi.Utilities;

public class TestProviderImpl : Provider
{
    public override Task<ConstructResponse> Construct(ConstructRequest request, CancellationToken ct)
    {
        return request.Type switch
        {
            "my-component:index:Component" => Construct<ComponentArgs, Component>(request,
                (name, args, options) => Task.FromResult(new Component(name, args, options))),
            _ => throw new NotImplementedException()
        };
    }

    public override Task<GetSchemaResponse> GetSchema(GetSchemaRequest request, CancellationToken ct)
    {
        string currentFilePath = new System.Diagnostics.StackTrace(true).GetFrame(0)!.GetFileName()!;
        string currentDirectory = Path.GetDirectoryName(currentFilePath)!;
        var schemaPath = Path.Combine(currentDirectory, "schema.json");
        return Task.FromResult(new GetSchemaResponse
        {
            Schema = File.ReadAllText(schemaPath),
        });
    }

    public override Task<CheckResponse> CheckConfig(CheckRequest request, CancellationToken ct)
    {
        return Task.FromResult(new CheckResponse());
    }

    public override Task<ConfigureResponse> Configure(ConfigureRequest request, CancellationToken ct)
    {
        return Task.FromResult(new ConfigureResponse()
        {
            AcceptOutputs = true,
            AcceptResources = true,
            AcceptSecrets = true,
            SupportsPreview = true
        });
    }

    protected async Task<ConstructResponse> Construct<TArgs, TResource>(
        ConstructRequest request,
        Func<string, TArgs, ComponentResourceOptions, Task<TResource>> factory
    )
        where TResource : ComponentResource
    {
#pragma warning disable CS0618 // Type or member is obsolete
        var serializer = new PropertyValueSerializer();
#pragma warning restore CS0618 // Type or member is obsolete
        var args = await serializer.Deserialize<TArgs>(new PropertyValue(request.Inputs));
        var resource = await factory(request.Name, args, request.Options);

        var urn = await OutputUtilities.GetValueAsync(resource.Urn);
        if (string.IsNullOrEmpty(urn))
        {
            throw new InvalidOperationException($"URN of resource {request.Name} is not known.");
        }

        var stateValue = await StateFromComponentResource(serializer, resource);

        return new ConstructResponse(new Pulumi.Experimental.Provider.Urn(urn), stateValue, ImmutableDictionary<string, ISet<Pulumi.Experimental.Provider.Urn>>.Empty);
    }

    async Task<ImmutableDictionary<string, PropertyValue>> StateFromComponentResource(
#pragma warning disable CS0618 // Type or member is obsolete
            PropertyValueSerializer serializer, ComponentResource component)
#pragma warning restore CS0618 // Type or member is obsolete
    {
        var state = new Dictionary<string, PropertyValue>();
        var componentType = component.GetType();
        var properties = componentType.GetProperties();
        foreach (var property in properties)
        {
            var outputAttr = property
                .GetCustomAttributes(typeof(OutputAttribute), false)
                .FirstOrDefault();

            if (outputAttr is OutputAttribute attr)
            {
                var propertyName = property.Name;
                if (!string.IsNullOrWhiteSpace(attr.Name))
                {
                    propertyName = attr.Name;
                }

                var value = property.GetValue(component);
                if (value != null)
                {
                    var serialized = await serializer.Serialize(value);
                    state.Add(propertyName, serialized);
                }
            }
        }

        return state.ToImmutableDictionary();
    }
}
