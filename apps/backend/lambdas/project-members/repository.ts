import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ProjectMember, ProjectRole } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const getProjectMembership = async (
  tableName: string,
  projectId: string,
  userId: string,
): Promise<ProjectMember | null> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { projectId, userId },
    }),
  );

  return (result.Item as ProjectMember) ?? null;
};

export const putProjectMember = async (
  tableName: string,
  member: ProjectMember,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: member,
    }),
  );
};

export const deleteProjectMember = async (
  tableName: string,
  projectId: string,
  userId: string,
): Promise<void> => {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { projectId, userId },
    }),
  );
};

export const updateProjectMemberRole = async (
  tableName: string,
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { projectId, userId },
      UpdateExpression: "SET #r = :role",
      ExpressionAttributeNames: { "#r": "role" },
      ExpressionAttributeValues: { ":role": role },
    }),
  );
};

export const listProjectMembers = async (
  tableName: string,
  projectId: string,
): Promise<ProjectMember[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "projectId = :pid",
      ExpressionAttributeValues: {
        ":pid": projectId,
      },
    }),
  );

  return (result.Items as ProjectMember[]) ?? [];
};
