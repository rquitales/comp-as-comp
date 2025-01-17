using System;
using System.Text;
using Pulumi;
using Pulumi.Random;

public sealed class RandomComponentArgs : ResourceArgs
{
    [Input("length")]
    public Input<int> Length { get; set; } = null!;
}

class RandomComponent : ComponentResource
{
    private static readonly char[] Chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".ToCharArray();

    [Output("password")]
    public Output<string> Password { get; set; }


    public RandomComponent(string name, RandomComponentArgs args, ComponentResourceOptions? opts = null)
        : base("dotnet-components:index:RandomComponent", name, args, opts)
    {
        var pwd = new RandomPassword($"{name}-pwd", new RandomPasswordArgs
        {
            Length = args.Length
        },
        new() { Parent = this });
        Password = pwd.Result;
    }
}