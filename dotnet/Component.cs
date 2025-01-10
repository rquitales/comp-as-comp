using System;
using System.Text;
using Pulumi;
using Pulumi.Random;

public sealed class ComponentArgs : ResourceArgs
{
    [Input("length")]
    public Input<int> Length { get; set; } = null!;
}


class Component : ComponentResource
{
    private static readonly char[] Chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".ToCharArray();

    [Output("password")]
    public Output<string> Password { get; set; }


    public Component(string name, ComponentArgs args, ComponentResourceOptions? opts = null)
        : base("my-component:index:Component", name, args, opts)
    {
        var pwd = new RandomPassword("pwd", new RandomPasswordArgs { Length = args.Length }, new() { Parent = this });
        Password = pwd.Result;
    }

    private static Output<string> GenerateRandomString(int length)
    {
        var result = new StringBuilder(length);
        var random = new Random();

        for (var i = 0; i < length; i++)
        {
            result.Append(Chars[random.Next(Chars.Length)]);
        }

        return Output.CreateSecret(result.ToString());
    }
}