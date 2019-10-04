import { App } from '@aws-cdk/core';
import { Pwcdk } from '../lib/lambda-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new App();

const lambdaStack = new Pwcdk(app, 'pwcdk');
new PipelineStack(app, 'pwcdk-pipeline', {
  lambdaCode: lambdaStack.lambdaCode,
});

app.synth();
