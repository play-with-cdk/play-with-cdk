# play-with-cdk


# build client-side variant
- currently not working because `process.versions.node.split('.')` is failing with `Uncaught TypeError: Cannot read property 'split' of undefined`

```
cd browser
npm install -g browserify
npm install tsify typescript @aws-cdk/core @aws-cdk/aws-s3 @aws-cdk/aws-cloudtrail process
browserify main.ts -t brfs -p [ tsify --noImplicitAny ]  > bundle.js
```
then open `index.html` in a browser

# build lambda / web frontend
- misses infrastructure code for lambda and api gateway lambda proxy, everything done manually so far
- slow because spawning `cdk synth` in a lambda is slow

```
cd lambda
npm run-script build
zip -q -r ../lambda.zip .
```

upload web/index.html to some bucket