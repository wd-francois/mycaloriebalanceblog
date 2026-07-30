// Shared helpers used across Convex query/mutation/action handlers, and
// (for sendResendEmail) from auth.ts's password-reset email callback, which
// runs as a plain function call rather than a schedulable Convex function.

// ── Coach ↔ client relationship checks ──────────────────────────────────────

// Throws unless `coachId` has an accepted (non-pending) coachClients link to
// `clientId`. Mirrors the shape already used inline in coaches.ts, programs.ts,
// and comments.ts.
export async function assertCoachOf(ctx: any, coachId: string, clientId: string) {
  const rel = await ctx.db
    .query("coachClients")
    .withIndex("by_coach", (q: any) => q.eq("coachId", coachId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("clientId"), clientId),
        q.neq(q.field("status"), "pending"),
      )
    )
    .first();
  if (!rel) throw new Error("Not authorized");
  return rel;
}

// Throws unless `userId` and `otherId` have an accepted relationship in
// either direction (userId is otherId's coach, or vice versa). Mirrors the
// shape already used inline in messages.ts.
export async function assertRelationship(ctx: any, userId: string, otherId: string) {
  const asCoach = await ctx.db
    .query("coachClients")
    .withIndex("by_coach", (q: any) => q.eq("coachId", userId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("clientId"), otherId),
        q.neq(q.field("status"), "pending"),
      )
    )
    .first();
  if (asCoach) return;

  const asClient = await ctx.db
    .query("coachClients")
    .withIndex("by_coach", (q: any) => q.eq("coachId", otherId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("clientId"), userId),
        q.neq(q.field("status"), "pending"),
      )
    )
    .first();
  if (!asClient) throw new Error("Not authorized");
}

// ── User email lookup ────────────────────────────────────────────────────────

// Resolves a user's email from the `users` table, falling back to the
// password-provider auth account (where the email is stored as
// providerAccountId). Mirrors the shape already used inline in coaches.ts
// (4x) and messages.ts.
export async function resolveUserEmail(ctx: any, userId: string): Promise<string | null> {
  const user = await ctx.db.get(userId);
  if (user?.email) return user.email;

  const account = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q: any) =>
      q.eq("userId", userId).eq("provider", "password"),
    )
    .first();
  return account?.providerAccountId ?? null;
}

// ── Coalesced notifications ──────────────────────────────────────────────────

// Inserts a notification for `recipientId` unless an unread one from the
// same sender/type already exists — keeps a client from getting a fresh
// notification row for every entry/comment/message before the last one is
// read. Mirrors the shape already used inline in entries.ts, comments.ts,
// and messages.ts.
export async function notifyOnce(
  ctx: any,
  args: { recipientId: string; senderId: string; type: "entry" | "message" | "comment" },
) {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_recipient", (q: any) => q.eq("recipientId", args.recipientId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("senderId"), args.senderId),
        q.eq(q.field("type"), args.type),
        q.eq(q.field("readAt"), undefined),
      )
    )
    .first();
  if (existing) return;

  await ctx.db.insert("notifications", {
    recipientId: args.recipientId,
    senderId: args.senderId,
    type: args.type,
  });
}

// ── Resend email sending ─────────────────────────────────────────────────────

// Sends a transactional HTML email via Resend. Shared by sendCoachInvite
// (convex/emails.ts) and the password-reset email (convex/auth.ts).
export async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<unknown> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "My Calorie Balance Pro <noreply@mycaloriebalance.com>",
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
  return await res.json();
}
