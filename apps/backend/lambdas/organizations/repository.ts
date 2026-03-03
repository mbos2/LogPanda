import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Organization } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const createOrganization = async (
  tableName: string,
  organization: Organization,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: organization,
    }),
  );
};

export const getOrganizationById = async (
  tableName: string,
  organizationId: string,
): Promise<Organization | null> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { organizationId },
    }),
  );

  return (result.Item as Organization) ?? null;
};

export const updateOrganization = async (
  tableName: string,
  organizationId: string,
  name: string,
): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { organizationId },
      UpdateExpression: "SET #n = :name",
      ExpressionAttributeNames: { "#n": "name" },
      ExpressionAttributeValues: { ":name": name },
    }),
  );
};

export const deleteOrganization = async (
  tableName: string,
  organizationId: string,
): Promise<void> => {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { organizationId },
    }),
  );
};
