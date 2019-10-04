import cdk = require('@aws-cdk/core');
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as process from 'process';
import crypto = require('crypto');
import { S3 } from 'aws-sdk';
import serialize = require('./lib/serialize');

fs.copyFileSync('work/tsconfig.json.tmpl','/tmp/tsconfig.json');

if (!fs.existsSync('/tmp/node_modules')){
  fs.symlinkSync(process.cwd() + '/node_modules', '/tmp/node_modules')
}

const s3 = new S3();
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

  try {
    // Load the construct module, compile it, instantiate it, synth it and serialize it as yaml template
    let module = require('/tmp/app-stack');
    const app = new cdk.App();
    new module.AppStack(app, 'AppStack');
    const assembly = app.synth();
    cf_template = serialize.toYAML(assembly.getStack('AppStack').template);

    delete require.cache[require.resolve('/tmp/app-stack')]
  } catch (error){
    console.log(error);
    responseCode = 500;
    responseBody = {
      error: "Error during compile and synth",
      details: error
    }
    const response = {
      statusCode: responseCode,
      body: JSON.stringify(responseBody),
      headers: {
        "Access-Control-Allow-Origin": '*'
      }
    };
    return response;
  }

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