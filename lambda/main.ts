import cdk = require('@aws-cdk/core');
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as process from 'process';
import crypto = require('crypto');
import { S3Client } from '@aws-sdk/client-s3-node';
import { PutObjectCommand } from '@aws-sdk/client-s3-node';

import serialize = require('./lib/serialize');

fs.copyFileSync('tsconfig.json','/tmp/tsconfig.json');

if (!fs.existsSync('/tmp/node_modules')){
  fs.symlinkSync(process.cwd() + '/node_modules', '/tmp/node_modules')
}

const s3 = new S3Client({});
require('ts-node').register({ })

export const handler = async (event: any = {}): Promise<any> => {

  let responseCode = 200;
  let responseBody, cf_template: any;

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
      "no-process-env": "error",
      "no-process-exit": "error",
      "no-path-concat": "error",
      "no-restricted-imports": [ "error", {
        "paths": ["assert","buffer","child_process","cluster","crypto","dgram","dns","domain","events","freelist","fs","http","https","module","net","os","path","process","punycode","querystring","readline","repl","smalloc","stream","string_decoder","sys","timers","tls","tracing","tty","url","util","vm","zlib"]
      }],
      "no-restricted-modules": [ "error", {
        "paths": ["assert","buffer","child_process","cluster","crypto","dgram","dns","domain","events","freelist","fs","http","https","module","net","os","path","process","punycode","querystring","readline","repl","smalloc","stream","string_decoder","sys","timers","tls","tracing","tty","url","util","vm","zlib"]
      }]
    }
  });
  const report = cli.executeOnText(event.body);

  console.log(JSON.stringify(report));

  if (report.errorCount > 0){
    if (report.results[0].messages[0].ruleId === null){
      responseBody = {
        error: "Failed check",
        details: "Line " + report.results[0].messages[0].line + ": " + report.results[0].messages[0].message
      }
    } else {
      responseBody = {
        error: "Failed security check",
        details: "Line " + report.results[0].messages[0].line + ": " + report.results[0].messages[0].message
      }
    }

    return {
      statusCode: 403,
      body: JSON.stringify(responseBody),
      headers: {
        "Access-Control-Allow-Origin": '*'
      }
    };
  }

  fs.writeFileSync('/tmp/app-stack.ts', event.body);
  console.log(require.resolve('/tmp/app-stack'));
  delete require.cache[require.resolve('/tmp/app-stack')];

  try {
    // Load the construct module, compile it, instantiate it, synth it and serialize it as yaml template
    let mod = require('/tmp/app-stack');
    const app = new cdk.App();
    new mod.AppStack(app, 'AppStack');
    console.log("Aspects: " + cdk.Aspects.of(app).aspects);
    const assembly = app.synth();
    cf_template = serialize.toYAML(assembly.getStackByName('AppStack').template);

    delete require.cache[require.resolve('/tmp/app-stack')]
  } catch (error){
    let out = execSync('ls -ltrh', {cwd: '/tmp'}).toString();
    console.log(out)
    out = execSync('node --version', {cwd: '/tmp'}).toString();
    console.log(out)
    out = execSync('ls -ltrh', {cwd: '/var/task'}).toString();
    console.log(out)
    console.log(fs.readFileSync('/tmp/app-stack.ts', 'utf8'));
    // console.log(fs.readFileSync('/var/task/main.js', 'utf8'));
    console.log(error);
    responseCode = 500;
    responseBody = {
      error: "Error during compile and synth",
      details: error.toString()
    }
    return {
      statusCode: responseCode,
      body: JSON.stringify(responseBody),
      headers: {
        "Access-Control-Allow-Origin": '*'
      }
    };
  }

  // Generate the md5 hash based on the input code
  let share_code = crypto.createHash('md5').update(event.body).digest('hex');

  let params_cf = {
    Body: cf_template, 
    Bucket: "play-with-cdk.com", 
    Key: 'shared/' + share_code + '_cf',
    ACL: 'public-read'
  };

  let params_code = {
    Body: event.body, 
    Bucket: "play-with-cdk.com", 
    Key: 'shared/' + share_code + '_code',
    ACL: 'public-read'
  };

  responseBody = {
    cf_template: cf_template,
    share_code: share_code,
    error: undefined
  }

  try {
    await s3.send(new PutObjectCommand(params_cf));
    await s3.send(new PutObjectCommand(params_code));
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