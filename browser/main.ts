import cdk = require('@aws-cdk/core');
import { AppStack } from './app-stack';

const app = new cdk.App();
const stack = new AppStack(app, 'AppStack');

console.log("blah")
console.log(app.synth())
