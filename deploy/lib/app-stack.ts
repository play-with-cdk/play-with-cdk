import codedeploy = require('@aws-cdk/aws-codedeploy');
import lambda = require('@aws-cdk/aws-lambda');
import s3 = require('@aws-cdk/aws-s3');
import apigateway = require("@aws-cdk/aws-apigateway");
import { App, Stack, StackProps, Duration } from '@aws-cdk/core';
import { ImagePullPrincipalType } from '@aws-cdk/aws-codebuild';
import { PolicyStatement } from '@aws-cdk/aws-iam';

export class Pwcdk extends Stack {
  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: App, id: string, props?: StackProps) {
    super(app, id, props);

    this.lambdaCode = lambda.Code.cfnParameters();

    //const bucket = s3.Bucket.fromBucketName(this, 'Bucket', 'www.play-with-cdk.com');

    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: 'play-with-cdk.com',
      websiteIndexDocument: 'index.html'
    });

    bucket.grantPublicAccess();

    const func = new lambda.Function(this, 'Lambda', {
      code: this.lambdaCode,
      handler: 'main.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      timeout: Duration.seconds(60),
      memorySize: 512
    });
 
    bucket.grantPut(func);
    
    const version = func.addVersion(new Date().toISOString());
    const alias = new lambda.Alias(this, 'LambdaAlias', {
      aliasName: 'Prod',
      version,
    });

    new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
      alias,
      deploymentConfig: codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE
    });

    const api = new apigateway.LambdaRestApi(this, "pwcdk", {
      handler: func,
      proxy: false,
      restApiName: "pwcdk",
      options: {
        deployOptions:{
          throttlingRateLimit: 1,
          throttlingBurstLimit: 1
        }
      }
    });

    const synth = api.root.addResource('synth');
    synth.addMethod("POST");

    addCorsOptions(api.root);
    addCorsOptions(synth);
  }
}

export function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      }
    }]
  })
}