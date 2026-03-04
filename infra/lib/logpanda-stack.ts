import * as cdk from "aws-cdk-lib/core";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as path from "path";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigwv2_authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class LogpandaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const envName = props?.stackName?.split("-")[1] ?? "dev";
    const batchSize = Number(this.node.tryGetContext("batchSize") ?? 10);
    const batchWindow = Number(this.node.tryGetContext("batchWindow") ?? 3);
    const workerConcurrency = Number(
      this.node.tryGetContext("workerConcurrency") ?? 5,
    );
    const apiRateLimit = Number(
      this.node.tryGetContext("apiRateLimit") ?? 2000,
    );
    const apiBurstLimit = Number(
      this.node.tryGetContext("apiBurstLimit") ?? 4000,
    );

    /** Cognito */

    const userPool = new cognito.UserPool(this, "LogpandaUserPool", {
      userPoolName: `logpanda-user-pool-${envName}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      "LogpandaUserPoolClient",
      {
        userPool,
        generateSecret: false, // IMPORTANT for frontend
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
      },
    );

    /** Dynamo DB */

    const tableRemovalPolicy =
      envName === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    const organizationsTable = new dynamodb.Table(this, "OrganizationsTable", {
      tableName: `logpanda-organizations-${envName}`,
      partitionKey: {
        name: "organizationId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: tableRemovalPolicy,
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
        removalPolicy: tableRemovalPolicy,
      },
    );

    organizationMembersTable.addGlobalSecondaryIndex({
      indexName: "userId-index",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const projectsTable = new dynamodb.Table(this, "ProjectsTable", {
      tableName: `logpanda-projects-${envName}`,
      partitionKey: { name: "projectId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: tableRemovalPolicy,
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
        removalPolicy: tableRemovalPolicy,
      },
    );

    const apiKeysTable = new dynamodb.Table(this, "ProjectApiKeysTable", {
      tableName: `logpanda-${envName}-project-api-keys`,
      partitionKey: {
        name: "apiKeyId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: tableRemovalPolicy,
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
      tableName: `logpanda-${envName}-audit-logs`,
      partitionKey: {
        name: "logId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: tableRemovalPolicy,
    });

    auditLogsTable.addGlobalSecondaryIndex({
      indexName: "projectId-timestamp-index",
      partitionKey: {
        name: "projectId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: dynamodb.AttributeType.STRING,
      },
    });

    /** SQS */

    const deadLetterQueue = new sqs.Queue(this, "AuditLogsDLQ", {
      queueName: `logpanda-${envName}-audit-logs-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const auditLogsQueue = new sqs.Queue(this, "AuditLogsQueue", {
      queueName: `logpanda-${envName}-audit-logs`,
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 5,
      },
    });

    /** HTTP API*/
    const jwtAuthorizer = new apigwv2_authorizers.HttpJwtAuthorizer(
      "LogpandaJwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      },
    );

    const httpApi = new apigwv2.HttpApi(this, "LogpandaHttpApi", {
      apiName: `logpanda-api-${envName}`,
      createDefaultStage: false,
    });

    new apigwv2.CfnStage(this, "LogpandaHttpApiStage", {
      apiId: httpApi.apiId,
      stageName: "$default",
      autoDeploy: true,
      defaultRouteSettings: {
        throttlingRateLimit: apiRateLimit,
        throttlingBurstLimit: apiBurstLimit,
      },
    });

    /** LAMBDA */
    const organizationsLambda = new NodejsFunction(
      this,
      "OrganizationsLambda",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        entry: path.join(
          __dirname,
          "../../apps/backend/lambdas/organizations/handler.ts",
        ),
        handler: "handler",
        environment: {
          ORGANIZATIONS_TABLE_NAME: organizationsTable.tableName,
          ORGANIZATION_MEMBERS_TABLE_NAME: organizationMembersTable.tableName,
        },
        logRetention: logs.RetentionDays.ONE_MONTH,
      },
    );

    const organizationsIntegration = new integrations.HttpLambdaIntegration(
      "OrganizationsIntegration",
      organizationsLambda,
    );

    httpApi.addRoutes({
      path: "/organizations",
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      integration: organizationsIntegration,
      authorizer: jwtAuthorizer,
    });

    const organizationMembersLambda = new NodejsFunction(
      this,
      "OrganizationMembersLambda",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        entry: path.join(
          __dirname,
          "../../apps/backend/lambdas/organization-members/handler.ts",
        ),
        handler: "handler",
        environment: {
          ORGANIZATION_MEMBERS_TABLE_NAME: organizationMembersTable.tableName,
        },
        logRetention: logs.RetentionDays.ONE_MONTH,
      },
    );

    const organizationMembersIntegration =
      new integrations.HttpLambdaIntegration(
        "OrganizationMembersIntegration",
        organizationMembersLambda,
      );

    httpApi.addRoutes({
      path: "/organization-members",
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      integration: organizationMembersIntegration,
      authorizer: jwtAuthorizer,
    });

    const projectsLambda = new NodejsFunction(this, "ProjectsLambda", {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(
        __dirname,
        "../../apps/backend/lambdas/projects/handler.ts",
      ),
      handler: "handler",
      environment: {
        PROJECTS_TABLE_NAME: projectsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE_NAME: organizationMembersTable.tableName,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const projectsIntegration = new integrations.HttpLambdaIntegration(
      "ProjectsIntegration",
      projectsLambda,
    );

    httpApi.addRoutes({
      path: "/projects",
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      integration: projectsIntegration,
      authorizer: jwtAuthorizer,
    });

    const projectMembersLambda = new NodejsFunction(
      this,
      "ProjectMembersLambda",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        entry: path.join(
          __dirname,
          "../../apps/backend/dist/lambdas/project-members/handler.ts",
        ),
        handler: "handler",
        environment: {
          PROJECT_MEMBERS_TABLE_NAME: projectMembersTable.tableName,
          PROJECTS_TABLE_NAME: projectsTable.tableName,
          ORGANIZATION_MEMBERS_TABLE_NAME: organizationMembersTable.tableName,
        },
        logRetention: logs.RetentionDays.ONE_MONTH,
      },
    );

    const projectMembersIntegration = new integrations.HttpLambdaIntegration(
      "ProjectMembersIntegration",
      projectMembersLambda,
    );

    httpApi.addRoutes({
      path: "/project-members",
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      integration: projectMembersIntegration,
      authorizer: jwtAuthorizer,
    });

    const projectApiKeysLambda = new NodejsFunction(
      this,
      "ProjectApiKeysLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../apps/backend/lambdas/project-api-keys/handler.ts",
        ),
        handler: "handler",
        bundling: {
          minify: true,
        },
        environment: {
          API_KEYS_TABLE_NAME: apiKeysTable.tableName,
          ORGANIZATION_MEMBERS_TABLE_NAME: organizationMembersTable.tableName,
          PROJECTS_TABLE_NAME: projectsTable.tableName,
        },
        logRetention: logs.RetentionDays.ONE_MONTH,
      },
    );

    const projectApiKeysIntegration = new integrations.HttpLambdaIntegration(
      "ProjectApiKeysIntegration",
      projectApiKeysLambda,
    );

    httpApi.addRoutes({
      path: "/project-api-keys",
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.DELETE,
      ],
      integration: projectApiKeysIntegration,
      authorizer: jwtAuthorizer,
    });

    const auditLogsIngestLambda = new NodejsFunction(
      this,
      "AuditLogsIngestLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../apps/backend/lambdas/audit-logs/ingest-handler.ts",
        ),
        handler: "handler",
        memorySize: 256,
        timeout: cdk.Duration.seconds(10),
        logRetention: logs.RetentionDays.ONE_MONTH,
        environment: {
          AUDIT_LOGS_QUEUE_URL: auditLogsQueue.queueUrl,
          API_KEYS_TABLE_NAME: apiKeysTable.tableName,
          PROJECTS_TABLE_NAME: projectsTable.tableName,
        },
      },
    );

    // SQS permission
    auditLogsQueue.grantSendMessages(auditLogsIngestLambda);

    const auditLogsLambda = new NodejsFunction(this, "AuditLogsLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(
        __dirname,
        "../../apps/backend/lambdas/audit-logs/handler.ts",
      ),
      handler: "handler",
      bundling: {
        minify: true,
      },
      environment: {
        AUDIT_LOGS_TABLE_NAME: auditLogsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE_NAME: organizationMembersTable.tableName,
        PROJECTS_TABLE_NAME: projectsTable.tableName,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const auditLogsIntegration = new integrations.HttpLambdaIntegration(
      "AuditLogsIntegration",
      auditLogsLambda,
    );

    const auditLogsIngestIntegration = new integrations.HttpLambdaIntegration(
      "AuditLogsIngestIntegration",
      auditLogsIngestLambda,
    );

    httpApi.addRoutes({
      path: "/audit-logs",
      methods: [apigwv2.HttpMethod.GET],
      integration: auditLogsIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/ingest",
      methods: [apigwv2.HttpMethod.POST],
      integration: auditLogsIngestIntegration,
    });

    /** WORKER LAMBDA FOR LOGS */
    const auditLogsWorkerLambda = new NodejsFunction(
      this,
      "AuditLogsWorkerLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../apps/backend/lambdas/audit-logs/worker-handler.ts",
        ),
        handler: "handler",
        memorySize: 256,
        timeout: cdk.Duration.seconds(15),
        logRetention: logs.RetentionDays.ONE_MONTH,
        reservedConcurrentExecutions: workerConcurrency,
        environment: {
          AUDIT_LOGS_TABLE_NAME: auditLogsTable.tableName,
        },
      },
    );

    auditLogsWorkerLambda.addEventSource(
      new SqsEventSource(auditLogsQueue, {
        batchSize,
        maxBatchingWindow: cdk.Duration.seconds(batchWindow),
      }),
    );

    /** AUTH LAMBDAS */
    const createAuthLambda = (id: string, entryFile: string) =>
      new NodejsFunction(this, id, {
        runtime: lambda.Runtime.NODEJS_24_X,
        entry: path.join(
          __dirname,
          "../../apps/backend/lambdas/auth",
          entryFile,
          "handler.ts",
        ),
        handler: "handler",
        bundling: {
          minify: true,
        },
        memorySize: 256,
        timeout: cdk.Duration.seconds(10),
        logRetention: logs.RetentionDays.ONE_MONTH,
        environment: {
          USER_POOL_ID: userPool.userPoolId,
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        },
      });

    const registerLambda = createAuthLambda("RegisterLambda", "register");
    const loginLambda = createAuthLambda("LoginLambda", "login");
    const refreshLambda = createAuthLambda("RefreshLambda", "refresh");
    const forgotPasswordLambda = createAuthLambda(
      "ForgotPasswordLambda",
      "forgot-password",
    );
    const confirmForgotPasswordLambda = createAuthLambda(
      "ConfirmForgotPasswordLambda",
      "confirm-forgot-password",
    );
    const logoutLambda = createAuthLambda("LogoutLambda", "logout");
    const meLambda = createAuthLambda("MeLambda", "me");
    const userByEmailLambda = createAuthLambda(
      "UserByEmailLambda",
      "user-by-email",
    );

    const registerIntegration = new integrations.HttpLambdaIntegration(
      "RegisterIntegration",
      registerLambda,
    );

    const loginIntegration = new integrations.HttpLambdaIntegration(
      "LoginIntegration",
      loginLambda,
    );

    const refreshIntegration = new integrations.HttpLambdaIntegration(
      "RefreshIntegration",
      refreshLambda,
    );

    const forgotPasswordIntegration = new integrations.HttpLambdaIntegration(
      "ForgotPasswordIntegration",
      forgotPasswordLambda,
    );

    const confirmForgotPasswordIntegration =
      new integrations.HttpLambdaIntegration(
        "ConfirmForgotPasswordIntegration",
        confirmForgotPasswordLambda,
      );

    const logoutIntegration = new integrations.HttpLambdaIntegration(
      "LogoutIntegration",
      logoutLambda,
    );

    const meIntegration = new integrations.HttpLambdaIntegration(
      "MeIntegration",
      meLambda,
    );

    const userByEmailIntegration = new integrations.HttpLambdaIntegration(
      "UserByEmailIntegration",
      userByEmailLambda,
    );

    httpApi.addRoutes({
      path: "/auth/register",
      methods: [apigwv2.HttpMethod.POST],
      integration: registerIntegration,
    });

    httpApi.addRoutes({
      path: "/auth/login",
      methods: [apigwv2.HttpMethod.POST],
      integration: loginIntegration,
    });

    httpApi.addRoutes({
      path: "/auth/refresh",
      methods: [apigwv2.HttpMethod.POST],
      integration: refreshIntegration,
    });

    httpApi.addRoutes({
      path: "/auth/forgot-password",
      methods: [apigwv2.HttpMethod.POST],
      integration: forgotPasswordIntegration,
    });

    httpApi.addRoutes({
      path: "/auth/confirm-forgot-password",
      methods: [apigwv2.HttpMethod.POST],
      integration: confirmForgotPasswordIntegration,
    });

    httpApi.addRoutes({
      path: "/auth/logout",
      methods: [apigwv2.HttpMethod.POST],
      integration: logoutIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/auth/me",
      methods: [apigwv2.HttpMethod.GET],
      integration: meIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/auth/user-by-email",
      methods: [apigwv2.HttpMethod.GET],
      integration: userByEmailIntegration,
      authorizer: jwtAuthorizer,
    });

    /** DB Access for Lambda*/
    organizationMembersTable.grantReadWriteData(organizationsLambda);
    organizationMembersTable.grantReadData(projectsLambda);
    organizationMembersTable.grantReadData(projectMembersLambda);
    organizationMembersTable.grantReadData(projectApiKeysLambda);
    organizationMembersTable.grantReadData(auditLogsIngestLambda);
    organizationsTable.grantReadWriteData(organizationsLambda);
    projectsTable.grantReadWriteData(projectsLambda);
    projectsTable.grantReadData(projectMembersLambda);
    projectsTable.grantReadData(projectApiKeysLambda);
    projectsTable.grantReadData(auditLogsIngestLambda);
    projectMembersTable.grantReadWriteData(projectMembersLambda);
    apiKeysTable.grantReadWriteData(projectApiKeysLambda);
    apiKeysTable.grantReadData(auditLogsIngestLambda);
    auditLogsTable.grantReadWriteData(auditLogsIngestLambda);
    auditLogsTable.grantWriteData(auditLogsWorkerLambda);
    auditLogsQueue.grantConsumeMessages(auditLogsWorkerLambda);
  }
}
