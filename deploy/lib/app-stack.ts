import codedeploy = require('@aws-cdk/aws-codedeploy');
import lambda = require('@aws-cdk/aws-lambda');
import s3 = require('@aws-cdk/aws-s3');
import apigateway = require("@aws-cdk/aws-apigateway");
import { App, Stack, StackProps, Duration } from '@aws-cdk/core';
import { ImagePullPrincipalType } from '@aws-cdk/aws-codebuild';
import { PolicyStatement, AccountRootPrincipal } from '@aws-cdk/aws-iam';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import { Metric, TreatMissingData } from '@aws-cdk/aws-cloudwatch';
import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as cloudwatch_actions from '@aws-cdk/aws-cloudwatch-actions';
import { SnsAction } from '@aws-cdk/aws-cloudwatch-actions';

export class Pwcdk extends Stack {
  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(app: App, id: string, props?: StackProps) {
    super(app, id, props);

    this.lambdaCode = lambda.Code.cfnParameters();

    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: 'play-with-cdk.com',
      websiteIndexDocument: 'index.html'
    });

    bucket.grantPublicAccess();
    bucket.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:*'],
      resources: [bucket.bucketArn],
      principals: [new AccountRootPrincipal()]
    }))

    bucket.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:*'],
      resources: [bucket.bucketArn + '/*'],
      principals: [new AccountRootPrincipal()]
    }))

    const topic = new sns.Topic(this, 'AlertTopic', {
      displayName: 'pwcdk-alerts'
    });

    topic.addSubscription(new subs.EmailSubscription('johannes@brueck.tech'));

    const func = new lambda.Function(this, 'Lambda', {
      code: this.lambdaCode,
      handler: 'main.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
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

    const lambdaErrorAlert = new cloudwatch.Alarm(this, "LambdaErrorAlert", {
      metric: func.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING
    })

    lambdaErrorAlert.addAlarmAction(
      new cloudwatch_actions.SnsAction(topic)
    );

    lambdaErrorAlert.addOkAction(
      new cloudwatch_actions.SnsAction(topic)
    );

    const api = new apigateway.LambdaRestApi(this, "pwcdk", {
      handler: func,
      proxy: false,
      restApiName: "pwcdk",
      options: {
        deployOptions:{
          throttlingRateLimit: 100,
          throttlingBurstLimit: 100
        }
      }
    });

    const synth = api.root.addResource('synth');
    synth.addMethod("POST");

    addCorsOptions(api.root);
    addCorsOptions(synth);

    const api5XXErrorAlert = new cloudwatch.Alarm(this, "Api5XXErrorAlert", {
      metric: new Metric({
        namespace: 'ApiGateway',
        metricName: '5XXError',
        dimensions: {
          ApiName: 'pwcdk',
          Stage: 'prod'
        }
      }),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING
    });

    api5XXErrorAlert.addAlarmAction(
      new cloudwatch_actions.SnsAction(topic)
    );

    api5XXErrorAlert.addOkAction(
      new cloudwatch_actions.SnsAction(topic)
    );

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
