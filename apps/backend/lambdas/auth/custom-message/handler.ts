import {
  CustomMessageTriggerEvent,
  CustomMessageTriggerHandler,
} from "aws-lambda";

const frontendBaseUrl = process.env.FRONTEND_BASE_URL;

if (!frontendBaseUrl) {
  throw new Error("Missing FRONTEND_BASE_URL");
}

const buildConfirmLink = (email: string, codePlaceholder: string): string => {
  const url = new URL("/confirm-sign-up", frontendBaseUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("code", codePlaceholder);
  return url.toString();
};

const buildResetLink = (email: string, codePlaceholder: string): string => {
  const url = new URL("/password-reset", frontendBaseUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("code", codePlaceholder);
  return url.toString();
};

export const handler: CustomMessageTriggerHandler = async (
  event: CustomMessageTriggerEvent,
): Promise<CustomMessageTriggerEvent> => {
  const email = event.request.userAttributes.email ?? "";
  const codePlaceholder = event.request.codeParameter;

  if (!email || !codePlaceholder) {
    return event;
  }

  if (
    event.triggerSource === "CustomMessage_SignUp" ||
    event.triggerSource === "CustomMessage_ResendCode"
  ) {
    const confirmLink = buildConfirmLink(email, codePlaceholder);

    event.response.emailSubject = "Confirm your Log Panda account";
    event.response.emailMessage = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Confirm your account</h2>
          <p>Click the button below to confirm your Log Panda account.</p>
          <p>
            <a
              href="${confirmLink}"
              style="display:inline-block;padding:12px 20px;background:#4b6f44;color:#ffffff;text-decoration:none;border-radius:8px;"
            >
              Confirm account
            </a>
          </p>
          <p>If the button does not work, use this verification code:</p>
          <p style="font-size:18px;font-weight:bold;">${codePlaceholder}</p>
        </body>
      </html>
    `;

    return event;
  }

  if (event.triggerSource === "CustomMessage_ForgotPassword") {
    const resetLink = buildResetLink(email, codePlaceholder);

    event.response.emailSubject = "Reset your Log Panda password";
    event.response.emailMessage = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Reset your password</h2>
          <p>Click the button below to reset your password.</p>
          <p>
            <a
              href="${resetLink}"
              style="display:inline-block;padding:12px 20px;background:#4b6f44;color:#ffffff;text-decoration:none;border-radius:8px;"
            >
              Reset password
            </a>
          </p>
          <p>If the button does not work, use this reset code:</p>
          <p style="font-size:18px;font-weight:bold;">${codePlaceholder}</p>
        </body>
      </html>
    `;

    return event;
  }

  return event;
};
