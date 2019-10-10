# play-with-cdk

This is https://play-with-cdk.com  
It contains a lambda function that provides an API to run `cdk synth` and a little web frontend.


## Deploying

```
cd deploy/
cdk deploy pwcdk-pipeline
```

## Run web frontend locally
```
cd web/
npm run build && npm run serve
```

## Contributing

We are happy to accept PRs.

## Authors
- [Johannes Brück](https://github.com/bruecktech)
- [Philipp Garbe](https://github.com/pgarbe)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details