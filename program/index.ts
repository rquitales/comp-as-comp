import * as tls from "tls-self-signed-cert";

const cert = new tls.SelfSignedCertificate("mycert", {
    subject: {},
    dnsName: "example.com",
    validityPeriodHours: 24,
    localValidityPeriodHours: 24,
});
export const certPem = cert.pem;
