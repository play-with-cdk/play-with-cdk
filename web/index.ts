import * as monaco from "monaco-editor";

// @ts-ignore
self.MonacoEnvironment = {
  getWorkerUrl: function(moduleId, label) {
    if (label === "typescript" || label === "javascript") {
      return "./ts.worker.bundle.js";
    }
    return "./editor.worker.bundle.js";
  }
};

import * as alltypes from './typings.js';

alltypes.alltypes.forEach(element => {
  var content = atob(element.value);
  var name = element.name;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(content, name);
});


monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
	noSemanticValidation: false,
	noSyntaxValidation: false
});

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2016,
  allowNonTsExtensions: true,
  // module: monaco.languages.typescript.ModuleKind.CommonJS,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  noEmit: true,
  lib: [ 'es6' ]
});

//monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

var jsCode = `import * as cdk from '@aws-cdk/core';

// Add required imports, currently only @aws-cdk scoped packages are supported
import { Bucket } from '@aws-cdk/aws-s3';
import * as cloudtrail from '@aws-cdk/aws-cloudtrail';

// Keep the class name stable please
export class AppStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
    
        // Add your code here
        var bucket = Bucket.fromBucketName(this, 'CloudTrailBucket', 'mybucket');

        new cloudtrail.Trail(this, 'CloudTrail', {
        bucket: bucket,
        isMultiRegionTrail: true
        });

        // You should stop here
    }
}`;


declare global {
  interface Window { editor: any; output: any; synth: any; }
}
window.editor = window.editor || {};
window.output = window.output || {};
window.synth = window.synth || {};

window.editor = monaco.editor.create(document.getElementById('editor'), {
  // value: ["function x() {", '\tconsole.log("Hello world!");', "}"].join("\n"),
  // language: "typescript",
  model: monaco.editor.createModel(jsCode,"typescript", monaco.Uri.parse("file:///main.tsx")),
  theme: 'vs-dark'
});

window.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function() {
	window.synth();
});

window.output = monaco.editor.create(document.getElementById('output'), {
  language: "yaml",
  theme: 'vs-dark',
  readOnly: true
});


const params = new URLSearchParams(document.location.search);
const hash = params.get("s");
if(hash){
    load_code(hash);
    load_cf(hash);
}

function alert(type, message){
  document.getElementById("alert").classList.value = "alert alert-" + type;
  document.getElementById("alert").innerHTML = message.replace(/\n/g, "<br />");
}

window.synth = function() {
  document.getElementById("spinner").style.visibility = "visible"
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          const response = JSON.parse(this.responseText);
          window.output.setValue(response.cf_template);
          document.getElementById("share_code").innerHTML = '<a href="https://play-with-cdk.com?s=' + response.share_code + '">share</a>'
          document.getElementById("deploy").innerHTML = '<a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=myteststack&templateURL=https://s3-eu-west-1.amazonaws.com/play-with-cdk.com/shared/' + response.share_code + '_cf"><img src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"></a>'
          document.getElementById("spinner").style.visibility = "hidden";
          alert("success", "Synth successful");
      }
      if (this.readyState == 4 && this.status != 200) {
          document.getElementById("spinner").style.visibility = "hidden";
          try {
              const response = JSON.parse(this.responseText);
              alert("danger", response.error + "\n" + response.details.replace(/(?:\r\n|\r|\n)/g, '<br>'));
          } catch(err) {
              alert("danger", this.responseText);
          }
      }
  };
  xhttp.open("POST", "https://fvml9pequc.execute-api.eu-west-1.amazonaws.com/prod/synth", true);
  xhttp.send(window.editor.getValue());
}

function load_cf(hash) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          window.output.setValue(this.responseText);
          document.getElementById("deploy").innerHTML = '<a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=myteststack&templateURL=https://s3-eu-west-1.amazonaws.com/play-with-cdk.com/shared/' + hash + '_cf"><img src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"></a>'
      }
  };
  xhttp.open("GET", "https://play-with-cdk.com/shared/" + hash + '_cf', true);
  xhttp.send();
}

function load_code(hash) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          window.editor.setValue(this.responseText);
          document.getElementById("share_code").innerHTML = '<a href="https://play-with-cdk.com?s=' + hash + '">share</a>'
      }
  };
  xhttp.open("GET", "https://play-with-cdk.com/shared/" + hash + '_code', true);
  xhttp.send();
}
