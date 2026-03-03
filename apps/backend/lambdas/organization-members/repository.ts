import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { OrganizationMember, OrganizationRole } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const getMembership = async (
  tableName: string,
  organizationId: string,
  userId: string,
): Promise<OrganizationMember | null> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { organizationId, userId },
    }),
  );

  return (result.Item as OrganizationMember) ?? null;
};

export const putMember = async (
  tableName: string,
  member: OrganizationMember,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: member,
    }),
  );
};

export const deleteMember = async (
  tableName: string,
  organizationId: string,
  userId: string,
): Promise<void> => {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { organizationId, userId },
    }),
  );
};

export const updateMemberRole = async (
  tableName: string,
  organizationId: string,
  userId: string,
  role: OrganizationRole,
): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { organizationId, userId },
      UpdateExpression: "SET #r = :role",
      ExpressionAttributeNames: { "#r": "role" },
      ExpressionAttributeValues: { ":role": role },
    }),
  );
};

export const listMembers = async (
  tableName: string,
  organizationId: string,
): Promise<OrganizationMember[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "organizationId = :orgId",
      ExpressionAttributeValues: {
        ":orgId": organizationId,
      },
    }),
  );

  return (result.Items as OrganizationMember[]) ?? [];
};
