import * as cdk from "aws-cdk-lib/core";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LogpandaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const envName = props?.stackName?.split("-")[1] ?? "dev";

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: `logpanda-users-${envName}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const organizationsTable = new dynamodb.Table(this, "OrganizationsTable", {
      tableName: `logpanda-organizations-${envName}`,
      partitionKey: {
        name: "organizationId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const organizationMembersTable = new dynamodb.Table(
      this,
      "OrganizationMembersTable",
      {
        tableName: `logpanda-organization-members-${envName}`,
        partitionKey: {
          name: "organizationId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    );

    const projectsTable = new dynamodb.Table(this, "ProjectsTable", {
      tableName: `logpanda-projects-${envName}`,
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    projectsTable.addGlobalSecondaryIndex({
      indexName: "organizationId-index",
      partitionKey: {
        name: "organizationId",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const projectMembersTable = new dynamodb.Table(
      this,
      "ProjectMembersTable",
      {
        tableName: `logpanda-project-members-${envName}`,
        partitionKey: {
          name: "projectId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    );

    const apiKeysTable = new dynamodb.Table(this, "ApiKeysTable", {
      tableName: `logpanda-api-keys-${envName}`,
      partitionKey: { name: "apiKeyId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    apiKeysTable.addGlobalSecondaryIndex({
      indexName: "projectId-index",
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
    });

    apiKeysTable.addGlobalSecondaryIndex({
      indexName: "keyHash-index",
      partitionKey: {
        name: "keyHash",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const auditLogsTable = new dynamodb.Table(this, "AuditLogsTable", {
      tableName: `logpanda-audit-logs-${envName}`,
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
