import { SQSEvent, SQSRecord } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { AuditLog } from "./types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.AUDIT_LOGS_TABLE_NAME as string;
const retentionDaysRaw = process.env.LOG_RETENTION_DAYS;

if (!tableName) throw new Error("AUDIT_LOGS_TABLE_NAME not defined");

const retentionDays =
  retentionDaysRaw && retentionDaysRaw.length > 0
    ? Number(retentionDaysRaw)
    : null;

const MAX_BATCH_SIZE = 25;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function attachTTL(log: AuditLog) {
  if (!retentionDays || retentionDays <= 0) return log;

  const expiresAt = Math.floor(Date.now() / 1000) + retentionDays * 86400;

  return { ...log, expiresAt };
}

async function batchWriteLogs(logs: AuditLog[]): Promise<void> {
  const chunks = chunkArray(logs, MAX_BATCH_SIZE);

  for (const chunk of chunks) {
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: chunk.map((log) => ({
          PutRequest: { Item: attachTTL(log) },
        })),
      },
    });

    const response = await docClient.send(command);

    if (
      response.UnprocessedItems &&
      Object.keys(response.UnprocessedItems).length > 0
    ) {
      const retryCommand = new BatchWriteCommand({
        RequestItems: response.UnprocessedItems,
      });

      const retryResponse = await docClient.send(retryCommand);

      if (
        retryResponse.UnprocessedItems &&
        Object.keys(retryResponse.UnprocessedItems).length > 0
      ) {
        throw new Error("Failed to process some audit logs after retry");
      }
    }
  }
}

function parseMessage(record: SQSRecord): AuditLog {
  const body = JSON.parse(record.body) as AuditLog;

  if (
    !body.logId ||
    !body.projectId ||
    !body.level ||
    !body.message ||
    !body.timestamp
  ) {
    throw new Error("Invalid audit log payload");
  }

  return body;
}

export const handler = async (event: SQSEvent) => {
  const batchItemFailures: { itemIdentifier: string }[] = [];
  const logs: AuditLog[] = [];

  for (const record of event.Records) {
    try {
      const parsed = parseMessage(record);
      logs.push(parsed);
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  try {
    if (logs.length) {
      await batchWriteLogs(logs);
    }
  } catch {
    for (const record of event.Records) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
