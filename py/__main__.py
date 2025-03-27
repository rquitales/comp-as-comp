from pulumi.provider.experimental import Metadata, component_provider_host
from staticpage import StaticPage

if __name__ == "__main__":
    component_provider_host(metadata=Metadata("python-components"), components=[StaticPage])
