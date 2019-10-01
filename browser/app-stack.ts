import cdk = require('@aws-cdk/core');
import { Bucket } from '@aws-cdk/aws-s3';
import cloudtrail = require('@aws-cdk/aws-cloudtrail');


export class AppStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      var bucket = Bucket.fromBucketName(this, 'CloudTrailBucket', 'mybucket');

      new cloudtrail.Trail(this, 'CloudTrail', {
        bucket: bucket,
        isMultiRegionTrail: true
      });

    }
}