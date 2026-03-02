import * as cdk from "aws-cdk-lib";
import { LogpandaStack } from "../lib/logpanda-stack";

const app = new cdk.App();

const envName = app.node.tryGetContext("env");

if (!envName) {
  throw new Error("Please provide environment: -c env=dev | staging | prod");
}

new LogpandaStack(app, `logpanda-${envName}`, {
  stackName: `logpanda-${envName}`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
