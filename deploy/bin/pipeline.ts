import { App } from '@aws-cdk/core';
import { LambdaStack } from '../lib/lambda-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new App();

const lambdaStack = new LambdaStack(app, 'pwcdk');
new PipelineStack(app, 'pwcdk-pipeline', {
  lambdaCode: lambdaStack.lambdaCode,
});

app.synth();
