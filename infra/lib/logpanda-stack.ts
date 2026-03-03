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
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LogpandaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const envName = props?.stackName?.split("-")[1] ?? "dev";

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

    /** HTTP API (Lambda) */
    const jwtAuthorizer = new apigwv2_authorizers.HttpJwtAuthorizer(
      "LogpandaJwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      },
    );

    const httpApi = new apigwv2.HttpApi(this, "LogpandaHttpApi", {
      apiName: `logpanda-api-${envName}`,
    });

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

    const projectMembersLambda = new lambda.Function(
      this,
      "ProjectMembersLambda",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        handler: "handler.handler",
        code: lambda.Code.fromAsset(
          path.join(
            __dirname,
            "../../apps/backend/dist/lambdas/project-members",
          ),
        ),
        environment: {
          PROJECT_MEMBERS_TABLE_NAME: projectMembersTable.tableName,
          PROJECTS_TABLE_NAME: projectsTable.tableName,
          ORGANIZATION_MEMBERS_TABLE_NAME: organizationMembersTable.tableName,
        },
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

    /** AUTH LAMBDAS */
    const createAuthLambda = (id: string, assetPath: string) =>
      new lambda.Function(this, id, {
        runtime: lambda.Runtime.NODEJS_24_X,
        handler: "handler.handler",
        code: lambda.Code.fromAsset(
          path.join(
            __dirname,
            "../../apps/backend/dist/lambdas/auth",
            assetPath,
          ),
        ),
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

    /** DB Access */
    organizationMembersTable.grantReadWriteData(organizationsLambda);
    organizationMembersTable.grantReadData(projectsLambda);
    organizationMembersTable.grantReadData(projectMembersLambda);
    organizationsTable.grantReadWriteData(organizationsLambda);
    projectsTable.grantReadWriteData(projectsLambda);
    projectsTable.grantReadData(projectMembersLambda);
    projectMembersTable.grantReadWriteData(projectMembersLambda);
  }
}
