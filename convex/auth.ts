import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { sendResendEmail } from "./lib";

function buildResetEmailHtml(code: string) {
  return `
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
            <p style="margin:0 0 8px;font-size:15px;color:#374151">Hi,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              Use this code to reset your <strong>My Calorie Balance Pro</strong> password.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td align="center" bgcolor="#eff6ff" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px">
                  <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#1e40af;font-family:'SFMono-Regular',Consolas,monospace">${code}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
              This code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;font-size:11px;color:#9ca3af">My Calorie Balance Pro · Password reset request.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Auto-verify email so no email provider is needed for sign-up
      profile(params) {
        return {
          email: params.email as string,
          ...(params.name ? { name: params.name as string } : {}),
          emailVerificationTime: Date.now(),
        };
      },
      reset: Email({
        id: "password-reset", // distinct from the default "email" id
        maxAge: 60 * 15, // 15 minutes
        generateVerificationToken: async () => {
          // 6 random digits — easy to type manually, instead of the
          // library's default 32-char alphanumeric token.
          const digits = "0123456789";
          const bytes = new Uint8Array(6);
          crypto.getRandomValues(bytes);
          return Array.from(bytes, (b) => digits[b % 10]).join("");
        },
        async sendVerificationRequest({ identifier: email, token: code }) {
          await sendResendEmail({
            to: email,
            subject: "Your My Calorie Balance Pro password reset code",
            html: buildResetEmailHtml(code),
          });
        },
      }),
    }),
  ],
  jwt: {
    customClaims: async (ctx, { userId }) => {
      const user = await ctx.db.get(userId);
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      return {
        email: user?.email ?? null,
        role: settings?.role ?? "client",
      };
    },
  },
});
