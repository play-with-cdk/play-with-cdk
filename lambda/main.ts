import cdk = require('@aws-cdk/core');
//import { SynthUtils } from '@aws-cdk/assert';
//import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';
import crypto = require('crypto');
import { S3 } from 'aws-sdk';
import serialize = require('./lib/serialize');

fs.copyFileSync('work/app.ts.tmpl', '/tmp/app.ts');
fs.copyFileSync('work/cdk.json.tmpl','/tmp/cdk.json');
fs.copyFileSync('work/tsconfig.json.tmpl','/tmp/tsconfig.json');
fs.copyFileSync('work/package.json.tmpl','/tmp/package.json');
fs.copyFileSync('work/package-lock.json.tmpl','/tmp/package-lock.json');

try {
  let out = execSync('HOME=/tmp npm ci', {cwd: '/tmp'}).toString();
  console.log(out)
} catch (error) {
  console.log(error.status);
  console.log(error.message);
  console.log(error.stderr.toString());
  console.log(error.stdout.toString());
}

const s3 = new S3();
require('ts-node').register({ })

export const handler = async (event: any = {}): Promise<any> => {

  let responseCode = 200;
  let responseBody: any;

  console.log(event);

  const CLIEngine = require("eslint").CLIEngine;
  const cli = new CLIEngine({
    allowInlineConfig: false,
    useEslintrc: false,
    parser: "@typescript-eslint/parser",
    parserOptions: {
      sourceType: "module",
    },
    rules: {
        "no-process-env": "error"
    }
  });
  const report = cli.executeOnText(event.body);

  console.log(JSON.stringify(report));

  if (report.errorCount > 0){
    responseBody = {
      error: "Failed security check",
      details: "Line " + report.results[0].messages[0].line + ": " + report.results[0].messages[0].message
    }

    const response = {
      statusCode: 403,
      body: JSON.stringify(responseBody),
      headers: {
        "Access-Control-Allow-Origin": '*'
      }
    };
    return response;
  }

  fs.writeFileSync('/tmp/app-stack.ts', event.body);

  // Load the construct module, compile it, instantiate it, synth it and serialize it as yaml template
  let module = require('/tmp/app-stack');  
  const app = new cdk.App();
  new module.AppStack(app, 'AppStack');
  const assembly = app.synth();
  const cf_template = serialize.toYAML(assembly.getStack('AppStack').template);

  delete require.cache[require.resolve('/tmp/app-stack')]

  // Generate the md5 hash based on the input code
  let share_code = crypto.createHash('md5').update(event.body).digest('hex');

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
    share_code: share_code,
    error: undefined
  }

  try {
    await s3.putObject(params_cf).promise();
    await s3.putObject(params_code).promise();
  } catch (error){
    console.log(error);
    responseCode = 500;
    responseBody = {
      error: "Internal error while storing results"
    }
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