"""A Python Pulumi program"""

import pulumi_tls_self_signed_cert as tls_self_signed_cert

cert = tls_self_signed_cert.SelfSignedCertificate("mycert", 
    subject={},
    dns_name="example.com",
    validity_period_hours=24,
    local_validity_period_hours=24,
)
