import os.path
from typing import Optional

from pulumi import Inputs, ResourceOptions
from pulumi.provider import ConstructResult
import pulumi.provider as provider

from staticpage import StaticPage, StaticPageArgs


class Provider(provider.Provider):

    def __init__(self) -> None:
        with open(os.path.join(os.path.dirname(__file__), 'schema.json')) as schema_file:
            schema = schema_file.read().strip()
            super().__init__("0.1.0", schema)

    def construct(self,
                  name: str,
                  resource_type: str,
                  inputs: Inputs,
                  options: Optional[ResourceOptions] = None) -> ConstructResult:

        if resource_type == 'xyz:index:StaticPage':
            return _construct_static_page(name, inputs, options)

        raise Exception(f'Unknown resource type {resource_type}')


def _construct_static_page(name: str,
                           inputs: Inputs,
                           options: Optional[ResourceOptions] = None) -> ConstructResult:

    # Create the component resource.
    static_page = StaticPage(name, StaticPageArgs.from_inputs(inputs), dict(inputs), options)

    # Return the component resource's URN and outputs as its state.
    return provider.ConstructResult(
        urn=static_page.urn,
        state={
            'bucket': static_page.bucket,
            'websiteUrl': static_page.website_url
        })
