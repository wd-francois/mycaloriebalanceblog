import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { sendResendEmail } from "./lib";

export const sendCoachInvite = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
    coachName: v.optional(v.string()),
    coachEmail: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const displayCoach = args.coachName || args.coachEmail || "A coach";
    const displayClient = args.toName || args.toEmail;
    const appUrl = "https://mycaloriebalance.com/pro";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:32px 32px 20px;text-align:center;border-bottom:1px solid #f1f5f9">
            <img src="https://mycaloriebalance.com/email-logo.png" width="110" height="110" alt="My Calorie Balance" style="display:block;width:110px;height:110px;margin:0 auto;border:0" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;font-size:15px;color:#374151">Hi ${displayClient},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              <strong style="color:#111827">${displayCoach}</strong> wants to be your coach on <strong>My Calorie Balance Pro</strong>.
            </p>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="margin:0 0 8px;font-size:13px;color:#1e40af;font-weight:600">How to accept:</p>
              <ol style="margin:0;padding-left:18px;font-size:13px;color:#1e40af;line-height:1.8">
                <li>Click the button below to open the app</li>
                <li>Create a free account using <strong>${args.toEmail}</strong></li>
                <li>The coach request will appear on your Home screen</li>
                <li>Tap <strong>Accept</strong> to connect with your coach</li>
              </ol>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td align="center" bgcolor="#2563eb" style="background-color:#2563eb;background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:12px">
                  <a href="${appUrl}" style="display:inline-block;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px">
                    Create your account &amp; accept
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
              Already have an account? Sign in with <strong>${args.toEmail}</strong> and check your Home tab.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;font-size:11px;color:#9ca3af">My Calorie Balance Pro · You received this because a coach invited you.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return await sendResendEmail({
      to: args.toEmail,
      subject: `${displayCoach} wants to be your coach on My Calorie Balance`,
      html,
    });
  },
});
