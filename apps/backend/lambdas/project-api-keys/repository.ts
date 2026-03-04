import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ProjectApiKey } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const createApiKey = async (
  tableName: string,
  key: ProjectApiKey,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: key,
    }),
  );
};

export const getApiKeyById = async (
  tableName: string,
  apiKeyId: string,
): Promise<ProjectApiKey | null> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { apiKeyId },
    }),
  );

  return (result.Item as ProjectApiKey) ?? null;
};

export const listApiKeysByProject = async (
  tableName: string,
  projectId: string,
): Promise<ProjectApiKey[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "projectId-index",
      KeyConditionExpression: "projectId = :pid",
      ExpressionAttributeValues: {
        ":pid": projectId,
      },
    }),
  );

  return (result.Items as ProjectApiKey[]) ?? [];
};

export const deactivateApiKey = async (
  tableName: string,
  apiKeyId: string,
): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { apiKeyId },
      UpdateExpression: "SET isActive = :false",
      ExpressionAttributeValues: {
        ":false": false,
      },
    }),
  );
};
