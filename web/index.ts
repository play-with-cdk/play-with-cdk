import * as monaco from "monaco-editor";
import * as alltypes from './typings.js';
import 'bootstrap';

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
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  noEmit: true,
  lib: [ 'es6' ]
});

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
  interface Window { editor: any; output: any; synth: any; copyToClipboard: any;}
}
window.editor = window.editor || {};
window.output = window.output || {};
window.synth = window.synth || {};
window.copyToClipboard = window.copyToClipboard || {};

window.editor = monaco.editor.create(document.getElementById('editor'), {
  model: monaco.editor.createModel(jsCode,"typescript", monaco.Uri.parse("file:///main.tsx")),
  theme: 'vs-dark',
  minimap: {
		enabled: false
  },
  fontSize: 20,
  automaticLayout: true
});

window.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function() {
	window.synth();
});

window.output = monaco.editor.create(document.getElementById('output'), {
  language: "yaml",
  theme: 'vs-dark',
  readOnly: true,
  minimap: {
		enabled: false
  },
  fontSize: 20,
  automaticLayout: true
});

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

const params = new URLSearchParams(document.location.search);
const hash = params.get("s");
if(hash){
    load_code(hash);
    load_cf(hash);
    $('#deploy_link').attr('href', 'https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=myteststack&templateURL=https://s3-eu-west-1.amazonaws.com/play-with-cdk.com/shared/' + hash + '_cf');
    $('#deploy_link').show();
}

function alert(type, message){
  $('#output').hide();
  $('#alertmsg').removeClass();
  $('#alertmsg').addClass('text-' + type);
  $("#alertmsg").html(message.replace(/\n/g, "<br />"));
  $('#alert').show();
}

window.synth = function() {
  if (monaco.editor.getModelMarkers({resource: window.editor.getModel().uri }).filter(m => m.severity == monaco.MarkerSeverity.Error).length > 0){
    alert("danger", "&#128580 Cannot synth due to errors. Check the hints in the editor");
    return;
  }

  $("#spinner").show();
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          const response = JSON.parse(this.responseText);
          window.output.setValue(response.cf_template);
          $('#deploy_link').attr('href', 'https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=myteststack&templateURL=https://s3-eu-west-1.amazonaws.com/play-with-cdk.com/shared/' + response.share_code + '_cf');
          $('#sharing_twitter').attr('href', 'https://twitter.com/intent/tweet/?text=Look%20at%20my%20awesome%20CDK%20code&url=https%3A%2F%2Fplay-with-cdk.com?s=' + response.share_code);
          $('#sharing_email').attr('href', 'mailto:?subject=Look%20at%20my%20awesome%20CDK%20code&body=https%3A%2F%2Fplay-with-cdk.com?s=' + response.share_code);
          $('#sharing_reddit').attr('href', 'https://reddit.com/submit/?resubmit=true&title=Look%20at%20my%20awesome%20CDK%20code&url=https%3A%2F%2Fplay-with-cdk.com?s=' + response.share_code);
          $('#sharing_hackernews').attr('href', 'https://news.ycombinator.com/submitlink?t=Look%20at%20my%20awesome%20CDK%20code&u=https%3A%2F%2Fplay-with-cdk.com?s=' + response.share_code);
          $("#sharing_clipboard").on('click', function(e) { window.copyToClipboard('https://play-with-cdk.com?s=' + response.share_code) });
          $('#share_code').show();
          $('#deploy_link').show();
          $("#spinner").hide();
          $('#alert').hide();
          $('#output').show();
      }
      if (this.readyState == 4 && this.status != 200) {
          $("#spinner").hide();
          try {
              const response = JSON.parse(this.responseText);
              alert("danger", '&#128580 ' + response.error + "\n" + response.details.replace(/(?:\r\n|\r|\n)/g, '<br>'));
          } catch(err) {
              alert("danger", '&#128580 ' + this.responseText);
          }
      }
  };
  xhttp.open("POST", "https://fvml9pequc.execute-api.eu-west-1.amazonaws.com/prod/synth", true);
  xhttp.send(window.editor.getValue());
}

window.copyToClipboard = function(text: string){
  try{
    var $temp = $("<input>");
    $("#sharing_clipboard").append($temp);
    $temp.val(text).select();
    var retVal = document.execCommand("copy");
    $temp.remove();
  } catch(err) {
    console.log('Error while copying to clipboard: ' + err);
  }
}

function load_cf(hash) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          window.output.setValue(this.responseText);
          $("#deploy").html('<a target="_blank" href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=myteststack&templateURL=https://s3-eu-west-1.amazonaws.com/play-with-cdk.com/shared/' + hash + '_cf"><img src="launch-stack.svg"></a>');
          $('#output').show();
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
          $("#share_code").html('<a href="https://play-with-cdk.com?s=' + hash + '">share</a>');
      }
  };
  xhttp.open("GET", "https://play-with-cdk.com/shared/" + hash + '_code', true);
  xhttp.send();
}