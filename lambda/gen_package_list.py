#!/usr/bin/env python3

import urllib.request
import json

data = json.loads(urllib.request.urlopen("https://api.github.com/repos/aws/aws-cdk/contents/packages/@aws-cdk").read())
packages = list(map(lambda i: "@aws-cdk/" + i["name"], data))
print("\n".join(packages))
