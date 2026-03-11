import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export interface QueryLogsInput {
  tableName: string;
  projectId: string;
  from?: string;
  to?: string;
  levels?: string[];
  limit: number;
  cursor?: Record<string, any>;
}

export interface QueryLogsResult<T> {
  items: T[];
  nextCursor: Record<string, any> | null;
}

export const queryLogs = async <T>({
  tableName,
  projectId,
  from,
  to,
  levels,
  limit,
  cursor,
}: QueryLogsInput): Promise<QueryLogsResult<T>> => {
  const params: QueryCommandInput = {
    TableName: tableName,
    IndexName: "projectId-timestamp-index",
    KeyConditionExpression: "#pid = :pid",
    ExpressionAttributeNames: {
      "#pid": "projectId",
    },
    ExpressionAttributeValues: {
      ":pid": projectId,
    },
    Limit: limit,
    ExclusiveStartKey: cursor,
    ScanIndexForward: false,
  };

  if (from && to) {
    params.KeyConditionExpression += " AND #ts BETWEEN :from AND :to";
    params.ExpressionAttributeNames!["#ts"] = "timestamp";
    params.ExpressionAttributeValues![":from"] = from;
    params.ExpressionAttributeValues![":to"] = to;
  }

  if (levels && levels.length) {
    params.FilterExpression =
      levels.map((_, i) => `#lvl = :lvl${i}`).join(" OR ");
    params.ExpressionAttributeNames!["#lvl"] = "level";
    levels.forEach((l, i) => {
      params.ExpressionAttributeValues![`:lvl${i}`] = l;
    });
  }

  const res = await docClient.send(new QueryCommand(params));

  return {
    items: (res.Items as T[]) ?? [],
    nextCursor: res.LastEvaluatedKey ?? null,
  };
};