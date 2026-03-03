import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Project } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const createProject = async (
  tableName: string,
  project: Project,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: project,
    }),
  );
};

export const getProjectById = async (
  tableName: string,
  projectId: string,
): Promise<Project | null> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { projectId },
    }),
  );

  return (result.Item as Project) ?? null;
};

export const updateProject = async (
  tableName: string,
  projectId: string,
  name: string,
): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { projectId },
      UpdateExpression: "SET #n = :name",
      ExpressionAttributeNames: { "#n": "name" },
      ExpressionAttributeValues: { ":name": name },
    }),
  );
};

export const deleteProject = async (
  tableName: string,
  projectId: string,
): Promise<void> => {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { projectId },
    }),
  );
};

export const listProjectsByOrganization = async (
  tableName: string,
  organizationId: string,
): Promise<Project[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "organizationId-index",
      KeyConditionExpression: "organizationId = :orgId",
      ExpressionAttributeValues: {
        ":orgId": organizationId,
      },
    }),
  );

  return (result.Items as Project[]) ?? [];
};
