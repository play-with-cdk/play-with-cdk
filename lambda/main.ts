import cdk = require('@aws-cdk/core');
import { SynthUtils } from '@aws-cdk/assert';
import { AccountSetupStack } from './lib/account-setup-stack';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';



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

export const handler = async (event: any = {}): Promise<any> => {

  console.log(event);
  const cdktool = path.join(process.cwd(), 'node_modules/aws-cdk/bin/cdk');

  const responseCode = 200;
  
  //const responseBody = JSON.stringify(SynthUtils.toCloudFormation(stack))
  // const assembly = app.synth();
  //const responseBody = JSON.stringify(assembly.getStack('AccountSetupStack').template);

  fs.writeFileSync('/tmp/app-stack.ts', event.body);


  var responseBody = '';

  try {
    responseBody = execSync('HOME=/tmp ' + cdktool + ' synth', {cwd: '/tmp'}).toString();
  } catch (error) {
    console.log(error.status);
    console.log(error.message);
    console.log(error.stderr.toString());
    console.log(error.stdout.toString());
  }

  console.log(responseBody);

  const response = {
    statusCode: responseCode,
    body: responseBody,
    headers: {
      "Access-Control-Allow-Origin": '*'
    }
  };

  return response;
}