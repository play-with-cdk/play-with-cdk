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
  interface Window { editor: any; }
}
window.editor = window.editor || {};

window.editor = monaco.editor.create(document.getElementById('editor'), {
  // value: ["function x() {", '\tconsole.log("Hello world!");', "}"].join("\n"),
  // language: "typescript",
  model: monaco.editor.createModel(jsCode,"typescript", monaco.Uri.parse("file:///main.tsx"))
});