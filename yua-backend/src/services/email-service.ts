import nodemailer from "nodemailer";

export async function sendBillingFailureEmail(params: {
  userId: string;
  workspaceId: string;
  plan: string;
  graceUntil: Date;
}) {
  try {
    const {
      SMTP_HOST = "",
      SMTP_PORT = "",
      SMTP_USER = "",
      SMTP_PASS = "",
      BILLING_RETRY_URL = "https://yua.ai/billing",
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const subject = "YUA 결제 실패 안내";
    const graceDate = params.graceUntil.toISOString();
    const text = [
      "결제가 실패했습니다.",
      "3일 유예기간 안내",
      `유예 종료일: ${graceDate}`,
      `재결제 링크: ${BILLING_RETRY_URL}`,
    ].join("\n");

    await transporter.sendMail({
      from: SMTP_USER,
      to: SMTP_USER,
      subject,
      text,
    });

    console.log(
      `[Billing][Email] user=${params.userId} workspace=${params.workspaceId} status=sent`
    );
  } catch {
    return;
  }
}
