import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import lambda = require('@aws-cdk/aws-lambda');
import { App, Stack, StackProps, SecretValue, PhysicalName, RemovalPolicy, IAspect, IConstruct, Tokenization } from '@aws-cdk/core';
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';

import * as foobar from 'foobar';
import * as s3 from '@aws-cdk/aws-s3';
export interface PipelineStackProps extends StackProps {
  readonly lambdaCode: lambda.CfnParametersCode;
}

// export class ComplianceTests implements IAspect  {

//   public visit(node: IConstruct) : void {
//     if(node.constructor.name == "CfnBucket"){
//       console.log(node instanceof s3.CfnBucket)
//       console.log(Object.getPrototypeOf(s3.CfnBucket))
//       console.log(Object.getPrototypeOf(node))
//     }
//     if (node instanceof s3.CfnBucket){
//       node.node.addError('No unencrypted buckets are allowed');
//       if (!node.bucketEncryption 
//          || (!Tokenization.isResolvable(node.bucketEncryption)
//             && node.bucketEncryption.serverSideEncryptionConfiguration === [])) {
//         node.node.addError('No unencrypted buckets are allowed');
//       }
//     }  
//   }
// }

export class PipelineStack extends Stack {
  constructor(app: App, id: string, props: PipelineStackProps) {
    super(app, id, props);

    this.node.applyAspect(new foobar.ComplianceTests())
    // this.node.applyAspect(new ComplianceTests())

    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      bucketName: PhysicalName.GENERATE_IF_NEEDED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const cdkBuild = new codebuild.PipelineProject(this, 'CdkBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            "runtime-versions": {
              nodejs: 10
            },
            commands: [
              'cd deploy',
              'npm ci'
            ]
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist'
            ],
          },
        },
        artifacts: {
          'base-directory': 'deploy/dist',
          files: [
            'pwcdk.template.json',
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2
      },
    });
    const lambdaBuild = new codebuild.PipelineProject(this, 'LambdaBuild', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            "runtime-versions": {
              nodejs: 10
            },
            commands: [
              'cd lambda',
              'npm ci',
            ],
          },
          build: {
            commands: [
              'npm run build',
              './prune.sh'
            ]
          },
        },
        artifacts: {
          'base-directory': 'lambda',
          files: [
            'main.js',
            'tsconfig.json',
            'lib/**/*',
            'work/**/*',
            'node_modules/**/*',
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2
      },
    });

    const websiteBuildDeploy = new codebuild.PipelineProject(this, 'WebsiteBuildDeploy', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            "runtime-versions": {
              nodejs: 10,
            },
            commands: [
              'cd web',
              'npm ci'
            ]
          },
          build: {
            commands: [
              './generate_typings.sh',
              'npm run build',
              'aws s3 sync dist/br s3://play-with-cdk.com/ --exclude "*" --include "*.bundle.js" --content-type "application/javascript" --content-encoding "br" --cache-control max-age=31536000,public --acl public-read',
              'aws s3 sync dist/br s3://play-with-cdk.com/ --exclude "*" --include "*.worker.js" --content-type "application/javascript" --content-encoding "br" --cache-control max-age=300,public --acl public-read',
              'aws s3 sync dist s3://play-with-cdk.com/ --exclude "*.js" --cache-control max-age=300,public --acl public-read'
            ]
          }
        }
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2
      },
    });

    const websiteBucket = s3.Bucket.fromBucketName(this, 'WebsiteBucket', 'play-with-cdk.com');

    websiteBuildDeploy.addToRolePolicy(new PolicyStatement({
      actions: [
        's3:PutObject',
        's3:PutObjectAcl',
      ],
      resources: [ websiteBucket.bucketArn + '/*' ],
      effect: Effect.ALLOW
    }))
    websiteBuildDeploy.addToRolePolicy(new PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [ websiteBucket.bucketArn ],
      effect: Effect.ALLOW
    }))


    const sourceOutput = new codepipeline.Artifact();
    const cdkBuildOutput = new codepipeline.Artifact('CdkBuildOutput');
    const lambdaBuildOutput = new codepipeline.Artifact('LambdaBuildOutput');

    new codepipeline.Pipeline(this, 'Pipeline', {
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: 'play-with-cdk',
              repo: 'play-with-cdk',
              branch: 'master',
              oauthToken: SecretValue.secretsManager('github-token'),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Lambda_Build',
              project: lambdaBuild,
              input: sourceOutput,
              outputs: [lambdaBuildOutput],
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Build',
              project: cdkBuild,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Website_Build_Deploy',
              project: websiteBuildDeploy,
              input: sourceOutput
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Lambda_CFN_Deploy',
              templatePath: cdkBuildOutput.atPath('pwcdk.template.json'),
              stackName: 'pwcdk',
              adminPermissions: true,
              parameterOverrides: {
                ...props.lambdaCode.assign(lambdaBuildOutput.s3Location),
              },
              extraInputs: [lambdaBuildOutput],
            })
          ],
        },
      ],
    });
  }
}
