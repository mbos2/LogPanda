import { randomBytes, randomUUID } from "crypto";
import argon2 from "argon2";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "SECURITY";

interface Organization {
  organizationId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

interface OrganizationMember {
  organizationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
}

interface Project {
  projectId: string;
  organizationId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

interface ProjectMember {
  projectId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
}

interface ProjectApiKey {
  apiKeyId: string;
  projectId: string;
  name: string;
  keyHash: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

interface AuditLog {
  logId: string;
  projectId: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, JsonValue>;
  timestamp: string;
}

const TABLES = {
  organizations: "logpanda-organizations-dev",
  organizationMembers: "logpanda-organization-members-dev",
  projects: "logpanda-projects-dev",
  projectMembers: "logpanda-project-members-dev",
  apiKeys: "logpanda-dev-project-api-keys",
  auditLogs: "logpanda-dev-audit-logs",
} as const;

const USER_ID = "809c998c-3011-7079-fa94-7ecd86d0359a";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const MAX_BATCH_WRITE_SIZE = 25;
const now = new Date();

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFrom = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }

  return batches;
};

const daysAgoIso = (daysAgo: number): string => {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const randomTimestampWithinLastDays = (days: number): string => {
  const end = now.getTime();
  const start = end - days * 24 * 60 * 60 * 1000;
  return new Date(randomInt(start, end)).toISOString();
};

const randomIp = (): string =>
  `${randomInt(11, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(
    1,
    254,
  )}`;

const randomCountry = (): string =>
  randomFrom(["DE", "NL", "SE", "HR", "US", "GB", "FR", "PL", "ES", "IT"]);

const randomUserAgent = (): string =>
  randomFrom([
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  ]);

const randomEmail = (domain: string): string =>
  randomFrom([
    `alex@${domain}`,
    `maria@${domain}`,
    `ivan@${domain}`,
    `sarah@${domain}`,
    `tom@${domain}`,
    `nina@${domain}`,
    `james@${domain}`,
    `emma@${domain}`,
    `leo@${domain}`,
    `ana@${domain}`,
  ]);

const randomActor = (
  domain: string,
): { actorId: string; actorEmail: string; actorName: string } => {
  const first = randomFrom([
    "Alex",
    "Maria",
    "Ivan",
    "Sarah",
    "Tom",
    "Nina",
    "James",
    "Emma",
    "Leo",
    "Ana",
  ]);
  const last = randomFrom([
    "Parker",
    "Miller",
    "Kovacs",
    "Reed",
    "Turner",
    "Hughes",
    "Cole",
    "Novak",
    "Bennett",
    "Carter",
  ]);

  return {
    actorId: randomUUID(),
    actorEmail: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    actorName: `${first} ${last}`,
  };
};

const buildPlainApiKey = async (): Promise<{
  apiKeyId: string;
  plainTextKey: string;
  keyHash: string;
}> => {
  const apiKeyId = randomUUID();
  const secret = randomBytes(32).toString("hex");

  return {
    apiKeyId,
    plainTextKey: `lp_${apiKeyId}_${secret}`,
    keyHash: await argon2.hash(secret),
  };
};

const putItem = async <T extends object>(
  tableName: string,
  item: T,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
};

const batchPutItems = async <T extends object>(
  tableName: string,
  items: T[],
): Promise<void> => {
  const batches = chunk(items, MAX_BATCH_WRITE_SIZE);

  for (const batch of batches) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((item) => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      }),
    );
  }
};

const baseMetadata = (
  domain: string,
  projectId: string,
): Record<string, JsonValue> => {
  const actor = randomActor(domain);

  return {
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    actorName: actor.actorName,
    requestId: randomUUID(),
    traceId: randomUUID(),
    sessionId: randomUUID(),
    ipAddress: randomIp(),
    country: randomCountry(),
    userAgent: randomUserAgent(),
    environment: "production",
    projectId,
  };
};

const teamspaceTemplates = (
  projectId: string,
): Record<
  LogLevel,
  Array<{ message: string; metadata: Record<string, JsonValue> }>
> => ({
  INFO: [
    {
      message: "Workspace created successfully",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "workspace.create",
        resourceType: "workspace",
        resourceId: randomUUID(),
        workspaceName: randomFrom([
          "Marketing HQ",
          "Product Design",
          "Sales Ops",
          "Support Team",
        ]),
      },
    },
    {
      message: "Project status updated",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "project.status.update",
        resourceType: "project",
        resourceId: randomUUID(),
        previousStatus: randomFrom(["backlog", "planned", "in_progress"]),
        newStatus: randomFrom(["in_progress", "review", "completed"]),
      },
    },
    {
      message: "User invited to workspace",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "member.invite",
        resourceType: "workspace_member",
        invitedEmail: randomEmail("clientco.io"),
        role: randomFrom(["ADMIN", "MEMBER"]),
      },
    },
    {
      message: "Board exported successfully",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "board.export",
        resourceType: "board",
        resourceId: randomUUID(),
        format: randomFrom(["csv", "xlsx", "pdf"]),
      },
    },
    {
      message: "Comment added to task",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "task.comment.create",
        resourceType: "task",
        resourceId: randomUUID(),
        commentLength: randomInt(25, 220),
      },
    },
  ],
  WARN: [
    {
      message: "Large file upload detected",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "attachment.upload",
        resourceType: "attachment",
        fileSizeMb: randomInt(45, 180),
        thresholdMb: 50,
      },
    },
    {
      message: "Multiple failed sign-in attempts detected",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "auth.login.failed",
        failedAttempts: randomInt(3, 8),
      },
    },
    {
      message: "Invite link nearing expiration",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "invite.expiring",
        expiresInHours: randomInt(1, 10),
      },
    },
    {
      message: "High volume of board activity detected",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "board.activity.spike",
        eventsLastHour: randomInt(1200, 2800),
      },
    },
    {
      message: "Task imported with partial field mapping",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "task.import.partial",
        skippedFields: randomFrom([
          ["priority", "estimate"],
          ["assignee"],
          ["labels", "dueDate"],
        ]),
      },
    },
  ],
  ERROR: [
    {
      message: "Workspace export failed",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "workspace.export.failed",
        resourceType: "workspace",
        exportFormat: randomFrom(["csv", "xlsx", "pdf"]),
        errorCode: randomFrom([
          "EXPORT_TIMEOUT",
          "EXPORT_STORAGE_FAILURE",
          "UNEXPECTED_EXCEPTION",
        ]),
      },
    },
    {
      message: "Failed to assign member to task",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "task.assignee.update.failed",
        resourceType: "task",
        resourceId: randomUUID(),
        errorCode: randomFrom([
          "MEMBER_NOT_FOUND",
          "PERMISSION_DENIED",
          "CONFLICT",
        ]),
      },
    },
    {
      message: "Webhook delivery failed",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "webhook.delivery.failed",
        endpoint: "https://hooks.clientco.io/teamspace",
        responseStatus: randomFrom([500, 502, 503, 504]),
      },
    },
    {
      message: "Task import failed",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "task.import.failed",
        fileType: randomFrom(["csv", "xlsx"]),
        errorCode: randomFrom(["INVALID_FORMAT", "MISSING_COLUMNS"]),
      },
    },
    {
      message: "Attachment virus scan failed",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "attachment.scan.failed",
        resourceType: "attachment",
        fileName: randomFrom(["brief.pdf", "roadmap.xlsx", "logo.zip"]),
      },
    },
  ],
  DEBUG: [
    {
      message: "Task filter query executed",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "task.filter.query",
        filters: {
          assignee: randomFrom(["me", "team", "unassigned"]),
          status: randomFrom(["open", "in_progress", "done"]),
        },
      },
    },
    {
      message: "Pagination cursor issued for board feed",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "feed.cursor.issue",
        limit: randomInt(25, 100),
      },
    },
    {
      message: "Workspace settings payload validated",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "workspace.settings.validate",
        valid: true,
      },
    },
    {
      message: "Task reorder operation normalized",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "task.reorder.normalize",
        itemCount: randomInt(12, 84),
      },
    },
    {
      message: "User preferences cache refreshed",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "preferences.cache.refresh",
        cacheKey: randomUUID(),
      },
    },
  ],
  SECURITY: [
    {
      message: "Suspicious login location detected",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "auth.login.suspicious_location",
        riskScore: randomInt(61, 97),
        deviceTrusted: false,
      },
    },
    {
      message: "Privilege escalation attempt blocked",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "role.escalation.blocked",
        attemptedRole: "OWNER",
        actualRole: randomFrom(["MEMBER", "ADMIN"]),
      },
    },
    {
      message: "Invalid invite token rejected",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "invite.token.invalid",
        tokenSource: "email",
      },
    },
    {
      message: "API token used from unrecognized IP range",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "api_token.suspicious_use",
        tokenName: "Server Integration",
      },
    },
    {
      message: "Account locked after repeated login failures",
      metadata: {
        ...baseMetadata("teamspace.app", projectId),
        action: "auth.account.locked",
        failedAttempts: randomInt(8, 14),
      },
    },
  ],
});

const commerceTemplates = (
  projectId: string,
): Record<
  LogLevel,
  Array<{ message: string; metadata: Record<string, JsonValue> }>
> => ({
  INFO: [
    {
      message: "Order marked as paid",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "order.paid",
        resourceType: "order",
        resourceId: `ord_${randomInt(100000, 999999)}`,
        amount: randomInt(49, 780),
        currency: "EUR",
      },
    },
    {
      message: "Refund processed successfully",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "refund.completed",
        resourceType: "refund",
        resourceId: `ref_${randomInt(100000, 999999)}`,
        amount: randomInt(15, 240),
        currency: "EUR",
      },
    },
    {
      message: "Shipment dispatched to carrier",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "shipment.dispatched",
        resourceType: "shipment",
        resourceId: `shp_${randomInt(100000, 999999)}`,
        carrier: randomFrom(["DHL", "UPS", "GLS", "DPD"]),
      },
    },
    {
      message: "Discount campaign published",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "campaign.published",
        resourceType: "campaign",
        resourceId: randomUUID(),
        discountPercent: randomInt(10, 35),
      },
    },
    {
      message: "Customer profile updated",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "customer.profile.update",
        resourceType: "customer",
        resourceId: `cus_${randomInt(100000, 999999)}`,
      },
    },
  ],
  WARN: [
    {
      message: "Payment authorization requires manual review",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "payment.review.required",
        amount: randomInt(350, 1200),
        currency: "EUR",
      },
    },
    {
      message: "Inventory level below reorder threshold",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "inventory.low_stock",
        sku: randomFrom(["SKU-CHAIR-01", "SKU-MUG-09", "SKU-DESK-17"]),
        stockLeft: randomInt(1, 8),
      },
    },
    {
      message: "Shipping address validation partially failed",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "address.validation.partial",
        provider: "address_service",
      },
    },
    {
      message: "Customer triggered repeated refund requests",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "refund.pattern.warning",
        requestsIn30Days: randomInt(3, 6),
      },
    },
    {
      message: "Promotion code nearing usage cap",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "promotion.usage.threshold",
        code: randomFrom(["SUMMER25", "WELCOME10", "VIP20"]),
        remainingUses: randomInt(1, 10),
      },
    },
  ],
  ERROR: [
    {
      message: "Payment capture failed",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "payment.capture.failed",
        provider: randomFrom(["stripe", "adyen", "paypal"]),
        errorCode: randomFrom([
          "card_declined",
          "processing_error",
          "insufficient_funds",
        ]),
      },
    },
    {
      message: "Order export to ERP failed",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "erp.export.failed",
        provider: "netsuite",
        responseStatus: randomFrom([500, 502, 503]),
      },
    },
    {
      message: "Shipment label generation failed",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "shipping.label.failed",
        carrier: randomFrom(["DHL", "UPS", "GLS", "DPD"]),
      },
    },
    {
      message: "Refund creation failed",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "refund.create.failed",
        reason: randomFrom([
          "payment_provider_error",
          "order_not_refundable",
          "currency_mismatch",
        ]),
      },
    },
    {
      message: "Customer CSV import failed",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "customer.import.failed",
        invalidRows: randomInt(12, 84),
      },
    },
  ],
  DEBUG: [
    {
      message: "Order search query executed",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "order.search.query",
        limit: randomInt(20, 120),
      },
    },
    {
      message: "Product filter payload normalized",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "catalog.filter.normalize",
        valid: true,
      },
    },
    {
      message: "Refund request payload validated",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "refund.validate",
        parser: "zod",
      },
    },
    {
      message: "Pagination cursor issued for orders list",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "orders.cursor.issue",
        direction: "desc",
      },
    },
    {
      message: "Shipping webhook payload deserialized",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "shipping.webhook.deserialize",
        eventType: randomFrom([
          "shipment.updated",
          "shipment.delivered",
          "shipment.exception",
        ]),
      },
    },
  ],
  SECURITY: [
    {
      message: "Suspicious payment attempt blocked",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "payment.blocked",
        riskScore: randomInt(70, 99),
        provider: randomFrom(["stripe", "adyen", "paypal"]),
      },
    },
    {
      message: "Admin access from unknown device detected",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "admin.unknown_device",
        deviceTrusted: false,
      },
    },
    {
      message: "Refund abuse pattern detected",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "refund.abuse.detected",
        casesInWindow: randomInt(3, 7),
      },
    },
    {
      message: "Checkout bot behavior flagged",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "checkout.bot_suspected",
        requestBurst: randomInt(45, 160),
      },
    },
    {
      message: "Unauthorized admin settings change blocked",
      metadata: {
        ...baseMetadata("storefront.io", projectId),
        action: "settings.change.blocked",
        requiredRole: "OWNER",
        actualRole: randomFrom(["MEMBER", "ADMIN"]),
      },
    },
  ],
});

const buildLogsForProject = (
  projectId: string,
  countPerLevel: number,
  templates: Record<
    LogLevel,
    Array<{ message: string; metadata: Record<string, JsonValue> }>
  >,
): AuditLog[] => {
  const levels: LogLevel[] = ["INFO", "WARN", "ERROR", "DEBUG", "SECURITY"];
  const logs: AuditLog[] = [];

  for (const level of levels) {
    for (let i = 0; i < countPerLevel; i += 1) {
      const template = randomFrom(templates[level]);

      logs.push({
        logId: randomUUID(),
        projectId,
        level,
        message: template.message,
        metadata: template.metadata,
        timestamp: randomTimestampWithinLastDays(30),
      });
    }
  }

  return shuffle(logs);
};

async function main(): Promise<void> {
  const organizationId = randomUUID();
  const projectAId = randomUUID();
  const projectBId = randomUUID();

  const organization: Organization = {
    organizationId,
    name: "Northstar Ventures",
    createdAt: daysAgoIso(30),
    createdBy: USER_ID,
  };

  const organizationMember: OrganizationMember = {
    organizationId,
    userId: USER_ID,
    role: "OWNER",
    joinedAt: daysAgoIso(30),
  };

  const projectA: Project = {
    projectId: projectAId,
    organizationId,
    name: "Teamspace",
    createdAt: daysAgoIso(24),
    createdBy: USER_ID,
  };

  const projectB: Project = {
    projectId: projectBId,
    organizationId,
    name: "Commerce Ops",
    createdAt: daysAgoIso(17),
    createdBy: USER_ID,
  };

  const projectMembers: ProjectMember[] = [
    {
      projectId: projectAId,
      userId: USER_ID,
      role: "OWNER",
      joinedAt: daysAgoIso(24),
    },
    {
      projectId: projectBId,
      userId: USER_ID,
      role: "OWNER",
      joinedAt: daysAgoIso(17),
    },
  ];

  const projectAKey = await buildPlainApiKey();
  const projectBKey = await buildPlainApiKey();

  const apiKeys: ProjectApiKey[] = [
    {
      apiKeyId: projectAKey.apiKeyId,
      projectId: projectAId,
      name: "Teamspace Production Key",
      keyHash: projectAKey.keyHash,
      createdAt: daysAgoIso(20),
      createdBy: USER_ID,
      isActive: true,
    },
    {
      apiKeyId: projectBKey.apiKeyId,
      projectId: projectBId,
      name: "Commerce Ops Production Key",
      keyHash: projectBKey.keyHash,
      createdAt: daysAgoIso(14),
      createdBy: USER_ID,
      isActive: true,
    },
  ];

  const projectALogs = buildLogsForProject(
    projectAId,
    60,
    teamspaceTemplates(projectAId),
  );

  const projectBLogs = buildLogsForProject(
    projectBId,
    80,
    commerceTemplates(projectBId),
  );

  await putItem(TABLES.organizations, organization);
  await putItem(TABLES.organizationMembers, organizationMember);
  await batchPutItems(TABLES.projects, [projectA, projectB]);
  await batchPutItems(TABLES.projectMembers, projectMembers);
  await batchPutItems(TABLES.apiKeys, apiKeys);
  await batchPutItems(TABLES.auditLogs, [...projectALogs, ...projectBLogs]);

  console.log("");
  console.log("Seed complete.");
  console.log("");
  console.log("Organization:");
  console.log(`- ${organization.name} (${organization.organizationId})`);
  console.log("");
  console.log("Projects:");
  console.log(`- ${projectA.name} (${projectA.projectId})`);
  console.log(`- ${projectB.name} (${projectB.projectId})`);
  console.log("");
  console.log("API Keys:");
  console.log(`- ${projectA.name}: ${projectAKey.plainTextKey}`);
  console.log(`- ${projectB.name}: ${projectBKey.plainTextKey}`);
  console.log("");
  console.log("Inserted counts:");
  console.log("- organizations: 1");
  console.log("- organization-members: 1");
  console.log("- projects: 2");
  console.log("- project-members: 2");
  console.log("- project-api-keys: 2");
  console.log(`- audit-logs: ${projectALogs.length + projectBLogs.length}`);
  console.log(`  - ${projectA.name}: ${projectALogs.length}`);
  console.log(`  - ${projectB.name}: ${projectBLogs.length}`);
  console.log("");
}

main().catch((error: unknown) => {
  console.error("Seed failed.");
  console.error(error);
  process.exit(1);
});
