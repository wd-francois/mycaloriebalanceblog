import { v } from "convex/values";
import { action } from "./_generated/server";

export const sendCoachInvite = action({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
    coachName: v.optional(v.string()),
    coachEmail: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");

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
          <td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 32px 24px;text-align:center">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;margin-bottom:12px">
              <span style="font-size:28px">⭐</span>
            </div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">My Calorie Balance</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600">Pro</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;font-size:15px;color:#374151">Hi ${displayClient},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              <strong style="color:#111827">${displayCoach}</strong> wants to be your coach on <strong>My Calorie Balance Pro</strong> — a free app to track your nutrition, sleep, and fitness.
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
                <td align="center">
                  <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px">
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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "My Calorie Balance Pro <noreply@mycaloriebalance.com>",
        to: [args.toEmail],
        subject: `${displayCoach} wants to be your coach on My Calorie Balance`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend error ${res.status}: ${text}`);
    }

    return await res.json();
  },
});
