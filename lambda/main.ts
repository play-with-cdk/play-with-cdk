import cdk = require('@aws-cdk/core');
import { SynthUtils } from '@aws-cdk/assert';
import { AccountSetupStack } from './lib/account-setup-stack';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';
import crypto = require('crypto');
import { S3 } from 'aws-sdk';


fs.copyFileSync('work/app.ts.tmpl', '/tmp/app.ts');
fs.copyFileSync('work/cdk.json.tmpl','/tmp/cdk.json');
fs.copyFileSync('work/tsconfig.json.tmpl','/tmp/tsconfig.json');
fs.copyFileSync('work/package.json.tmpl','/tmp/package.json');
fs.copyFileSync('work/package-lock.json.tmpl','/tmp/package-lock.json');

try {
  var out = execSync('HOME=/tmp npm ci', {cwd: '/tmp'}).toString();
  console.log(out)
} catch (error) {
  console.log(error.status);
  console.log(error.message);
  console.log(error.stderr.toString());
  console.log(error.stdout.toString());
}

const s3 = new S3();

export const handler = async (event: any = {}): Promise<any> => {

  console.log(event);
  const cdktool = path.join(process.cwd(), 'node_modules/aws-cdk/bin/cdk');

  var responseCode = 200;
  
  //const responseBody = JSON.stringify(SynthUtils.toCloudFormation(stack))
  // const assembly = app.synth();
  //const responseBody = JSON.stringify(assembly.getStack('AccountSetupStack').template);

  fs.writeFileSync('/tmp/app-stack.ts', event.body);

  var cf_template = "";
  var share_code = "";
  var responseBody = {};

  try {
    cf_template = execSync('HOME=/tmp ' + cdktool + ' synth', {cwd: '/tmp'}).toString();
    share_code = crypto.createHash('md5').update(event.body).digest('hex');

  } catch (error) {
    console.log(error.status);
    console.log(error.message);
    console.log(error.stderr.toString());
    console.log(error.stdout.toString());
  }

  var params_cf = {
    Body: cf_template, 
    Bucket: "www.play-with-cdk.com", 
    Key: 'shared/' + share_code + '_cf',
    ACL: 'public-read'
  };

  var params_code = {
    Body: event.body, 
    Bucket: "www.play-with-cdk.com", 
    Key: 'shared/' + share_code + '_code',
    ACL: 'public-read'
  };

  responseBody = {
    cf_template: cf_template,
    share_code: share_code
  }

  try {
    await s3.putObject(params_cf).promise();
    await s3.putObject(params_code).promise();
  } catch (error){
    console.log(error);
    responseCode = 500;
    responseBody = {}
  }

  const response = {
    statusCode: responseCode,
    body: JSON.stringify(responseBody),
    headers: {
      "Access-Control-Allow-Origin": '*'
    }
  };

  console.log(response);
  return response;
}