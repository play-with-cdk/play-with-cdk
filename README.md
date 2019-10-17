# play-with-cdk

This is https://play-with-cdk.com  
It contains a lambda function that provides an API to run `cdk synth` and a little web frontend.


## Deploying the pipeline

```
cd deploy/
npm ci
cdk deploy pwcdk-pipeline
```

## Run web frontend locally
```
cd web/
npm run build && npm run serve
```

## Built With

* AWS API gateway, Lambda, S3, CloudFront, CodePipeline, CodeBuild, CodeDeploy
* [typescript](http://www.typescriptlang.org/)
* [monaco-editor](https://microsoft.github.io/monaco-editor/) - The editor that powers VS Code
* [node-prune](https://github.com/tuananh/node-prune) - Squeezing all of @aws-cdk into a lambda function
* [webpack](https://webpack.js.org/) - Building the frontend
* [bootstrap](https://getbootstrap.com/) - Frontend


## Contributing

We are happy to accept PRs.

## Authors
- [Johannes Brück](https://github.com/bruecktech)
- [Philipp Garbe](https://github.com/pgarbe)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
