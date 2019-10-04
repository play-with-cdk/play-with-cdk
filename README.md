# play-with-cdk


# build client-side variant
- currently not working because `process.versions.node.split('.')` is failing with `Uncaught TypeError: Cannot read property 'split' of undefined`

```
cd browser
npm install -g browserify
npm ci
browserify main.ts -t brfs -p [ tsify --noImplicitAny ]  > bundle.js
```
then open `index.html` in a browser

# build lambda / web frontend
- misses infrastructure code for lambda and api gateway lambda proxy, everything done manually so far
- slow because spawning `cdk synth` in a lambda is slow

```
cd lambda
npm ci
docker run --rm -v ${PWD}:/app hochzehn/node-prune
npm run-script build
zip -q -r ../lambda.zip .
```

upload web/index.html to some bucket