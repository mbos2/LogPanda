import crypto from "crypto";
import {
  CustomMessageTriggerEvent,
  CustomMessageTriggerHandler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const frontendBaseUrl = process.env.FRONTEND_BASE_URL;
const tableName = process.env.EMAIL_VERIFICATION_TOKENS_TABLE_NAME;

if (!frontendBaseUrl) {
  throw new Error("Missing FRONTEND_BASE_URL");
}

if (!tableName) {
  throw new Error("Missing EMAIL_VERIFICATION_TOKENS_TABLE_NAME");
}

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const buildConfirmSignUpLink = (token: string): string => {
  return `${frontendBaseUrl}/confirm-sign-up?token=${token}`;
};

const buildResetPasswordLink = (): string => {
  return `${frontendBaseUrl}/password-reset`;
};

export const handler: CustomMessageTriggerHandler = async (
  event: CustomMessageTriggerEvent,
): Promise<CustomMessageTriggerEvent> => {
  console.log("CUSTOM_MESSAGE_EVENT", {
    triggerSource: event.triggerSource,
    userName: event.userName,
    email: event.request.userAttributes.email,
  });

  const email = event.request.userAttributes.email ?? "";

  if (!email) {
    return event;
  }

  if (
    event.triggerSource === "CustomMessage_SignUp" ||
    event.triggerSource === "CustomMessage_ResendCode"
  ) {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    console.log("SIGNUP_BRANCH_ENTERED");
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          tokenHash,
          username: event.userName,
          email,
          createdAt: new Date().toISOString(),
          expiresAt,
          consumedAt: null,
        },
      }),
    );
    console.log("SIGNUP_TOKEN_STORED");
    const confirmLink = buildConfirmSignUpLink(rawToken);

    event.response.emailSubject = "Confirm your Log Panda account";
    event.response.emailMessage = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Confirm your account</h2>
          <p>Click the button below to verify your email address.</p>
          <p>
            <a
              href="${confirmLink}"
              style="display:inline-block;padding:12px 20px;background:#4b6f44;color:#ffffff;text-decoration:none;border-radius:8px;"
            >
              Verify email
            </a>
          </p>
          <p>If you did not create this account, you can ignore this email.</p>
        </body>
      </html>
    `;

    console.log("SIGNUP_EMAIL_RESPONSE_SET", {
      subject: event.response.emailSubject,
      hasMessage: Boolean(event.response.emailMessage),
    });
    return event;
  }

  if (event.triggerSource === "CustomMessage_ForgotPassword") {
    console.log("FORGOT_PASSWORD_BRANCH_ENTERED");
    const codePlaceholder = event.request.codeParameter;

    if (!codePlaceholder) {
      return event;
    }

    event.response.emailSubject = "Reset your Log Panda password";
    event.response.emailMessage = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Reset your password</h2>
          <p>Click the button below to open the password reset page.</p>
          <p>
            <a
              href="${buildResetPasswordLink()}"
              style="display:inline-block;padding:12px 20px;background:#4b6f44;color:#ffffff;text-decoration:none;border-radius:8px;"
            >
              Open password reset page
            </a>
          </p>
          <p>Use this verification code on the page:</p>
          <p style="font-size:18px;font-weight:bold;">${codePlaceholder}</p>
        </body>
      </html>
    `;

    return event;
  }

  return event;
};
