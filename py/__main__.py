import sys

import pulumi
import pulumi.provider
import provider


if __name__ == '__main__':
    pulumi.provider.main(provider.Provider(), sys.argv[1:])
