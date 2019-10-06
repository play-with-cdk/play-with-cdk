import { App } from '@aws-cdk/core';
import { Pwcdk } from '../lib/app-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new App();

const appStack = new Pwcdk(app, 'pwcdk');
new PipelineStack(app, 'pwcdk-pipeline', {
  lambdaCode: appStack.lambdaCode,
});

app.synth();
