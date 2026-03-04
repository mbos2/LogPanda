import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { AuditLog } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const createLog = async (
  tableName: string,
  log: AuditLog,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: log,
    }),
  );
};

export const listLogsByProject = async (
  tableName: string,
  projectId: string,
  limit = 50,
): Promise<AuditLog[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "projectId-timestamp-index",
      KeyConditionExpression: "projectId = :pid",
      ExpressionAttributeValues: {
        ":pid": projectId,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );

  return (result.Items as AuditLog[]) ?? [];
};
