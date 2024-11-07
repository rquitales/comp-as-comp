# Consuming components via a parameterized provider

```sh
$ cd program

$ pulumi package add ../component <full path>/comp-as-comp/pulumi-tls-self-signed-cert
Successfully generated a Nodejs SDK for the tls-self-signed-cert package at /Users/mikhailshilkov/go/src/github.com/pulumi/play/comp-as-comp/program/sdks/tls-self-signed-cert

To use this SDK in your Nodejs project, run the following command:

  yarn add tls-self-signed-cert@file:sdks/tls-self-signed-cert

You can then import the SDK in your TypeScript code with:

  import * as tls-self-signed-cert from "tls-self-signed-cert";

$ yarn add tls-self-signed-cert@file:sdks/tls-self-signed-cert

$ pulumi preview
pp
Previewing update (dev)

View in Browser (Ctrl+O): https://app.pulumi.com/mikhail-pulumi-corp/comp-as-comp/dev/previews/2cb6c3bf-aae0-440e-861f-3188967371be

     Type                                                 Name                                Plan       Info
     pulumi:pulumi:Stack                                  comp-as-comp-dev                              
 +   └─ tls-self-signed-cert:index:SelfSignedCertificate  selfsignedcertificate-1             create     
 +      └─ tls:index:PrivateKey                           selfsignedcertificate-1-ca          create     
 +         ├─ tls:index:SelfSignedCert                    selfsignedcertificate-1-ca          create     
 +         └─ tls:index:PrivateKey                        selfsignedcertificate-1-privateKey  create     
 +            └─ tls:index:CertRequest                    certRequest                         create     
 +               └─ tls:index:LocallySignedCert           cert                                create     

Outputs:
  + certPem     : output<string>

Resources:
    + 6 to create
```