import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ── Role ─────────────────────────────────────────────────────────────────────

export const getRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.role ?? "client";
  },
});

// ── Client list ───────────────────────────────────────────────────────────────

export const getClients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings?.role !== "coach") return [];

    const relationships = await ctx.db
      .query("coachClients")
      .withIndex("by_coach", (q) => q.eq("coachId", userId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.neq(q.field("clientId"), undefined),
        )
      )
      .collect();

    return await Promise.all(
      relationships.map(async (rel) => {
        const clientId = rel.clientId!;
        const user = await ctx.db.get(clientId);
        const passwordAccount = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) =>
            q.eq("userId", clientId).eq("provider", "password"),
          )
          .first();
        const email =
          user?.email ?? passwordAccount?.providerAccountId ?? null;

        const lastEntry = await ctx.db
          .query("entries")
          .withIndex("by_user", (q) => q.eq("userId", clientId))
          .order("desc")
          .first();

        return {
          id: clientId,
          email,
          name: user?.name ?? null,
          lastActiveDate: lastEntry?.date ?? null,
        };
      }),
    );
  },
});

// ── Link / unlink clients ─────────────────────────────────────────────────────

export const linkClient = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const coachId = await getAuthUserId(ctx);
    if (!coachId) throw new Error("Not authenticated");

    const coachSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", coachId))
      .first();
    if (coachSettings?.role !== "coach") throw new Error("Not a coach");

    const coachUser = await ctx.db.get(coachId);
    const coachEmail = coachUser?.email ?? null;
    if (coachEmail && coachEmail.toLowerCase() === args.email.toLowerCase()) {
      throw new Error("You cannot add yourself as a client");
    }

    const normalizedEmail = args.email.toLowerCase();

    // Check if the client already has an account
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", normalizedEmail),
      )
      .first();

    if (account) {
      // Client has an account — invite by userId
      const clientId = account.userId;
      const existing = await ctx.db
        .query("coachClients")
        .withIndex("by_coach", (q) => q.eq("coachId", coachId))
        .filter((q) => q.eq(q.field("clientId"), clientId))
        .first();
      if (existing) {
        throw new Error(
          existing.status === "pending"
            ? "Invite already sent — waiting for client to accept"
            : "Client already linked",
        );
      }
      const clientUser = await ctx.db.get(clientId);
      await ctx.db.insert("coachClients", { coachId, clientId, status: "pending" });
      try {
        await ctx.scheduler.runAfter(0, internal.emails.sendCoachInvite, {
          toEmail: normalizedEmail,
          toName: clientUser?.name ?? undefined,
          coachName: coachUser?.name ?? undefined,
          coachEmail: coachEmail ?? undefined,
        });
      } catch {}
      return { clientId };
    } else {
      // Client doesn't have an account yet — store invite by email
      const existingEmail = await ctx.db
        .query("coachClients")
        .withIndex("by_invite_email", (q) => q.eq("inviteEmail", normalizedEmail))
        .filter((q) => q.eq(q.field("coachId"), coachId))
        .first();
      if (existingEmail) {
        throw new Error("Invite already sent to this email — waiting for them to sign up");
      }
      await ctx.db.insert("coachClients", {
        coachId,
        inviteEmail: normalizedEmail,
        status: "pending",
      });
      try {
        await ctx.scheduler.runAfter(0, internal.emails.sendCoachInvite, {
          toEmail: normalizedEmail,
          coachName: coachUser?.name ?? undefined,
          coachEmail: coachEmail ?? undefined,
        });
      } catch {}
      return { inviteEmail: normalizedEmail };
    }
  },
});

export const unlinkClient = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const coachId = await getAuthUserId(ctx);
    if (!coachId) throw new Error("Not authenticated");

    const rel = await ctx.db
      .query("coachClients")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .first();
    if (!rel) throw new Error("Relationship not found");

    await ctx.db.delete(rel._id);
  },
});

export const cancelInvite = mutation({
  args: { inviteId: v.id("coachClients") },
  handler: async (ctx, args) => {
    const coachId = await getAuthUserId(ctx);
    if (!coachId) throw new Error("Not authenticated");

    const rel = await ctx.db.get(args.inviteId);
    if (!rel || rel.coachId !== coachId) throw new Error("Not authorized");

    await ctx.db.delete(args.inviteId);
  },
});

// ── Invite approval (client-side) ─────────────────────────────────────────────

export const getPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const pending = await ctx.db
      .query("coachClients")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return await Promise.all(
      pending.map(async (rel) => {
        const user = await ctx.db.get(rel.coachId);
        const account = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) =>
            q.eq("userId", rel.coachId).eq("provider", "password"),
          )
          .first();
        return {
          id: rel._id,
          coachId: rel.coachId,
          email: user?.email ?? account?.providerAccountId ?? null,
          name: user?.name ?? null,
        };
      }),
    );
  },
});

export const acceptInvite = mutation({
  args: { inviteId: v.id("coachClients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rel = await ctx.db.get(args.inviteId);
    if (!rel || rel.clientId !== userId) throw new Error("Not authorized");
    if (rel.status !== "pending") throw new Error("Invite is not pending");

    await ctx.db.patch(args.inviteId, { status: "accepted" });
  },
});

export const getSentInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const pending = await ctx.db
      .query("coachClients")
      .withIndex("by_coach", (q) => q.eq("coachId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return await Promise.all(
      pending.map(async (rel) => {
        // Email-only invite (client hasn't signed up yet)
        if (!rel.clientId) {
          return {
            id: rel._id,
            clientId: undefined,
            email: rel.inviteEmail ?? null,
            name: null,
            signedUp: false,
          };
        }
        // User-linked invite
        const user = await ctx.db.get(rel.clientId);
        const account = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) =>
            q.eq("userId", rel.clientId!).eq("provider", "password"),
          )
          .first();
        return {
          id: rel._id,
          clientId: rel.clientId,
          email: user?.email ?? account?.providerAccountId ?? null,
          name: user?.name ?? null,
          signedUp: true,
        };
      }),
    );
  },
});

// Called when a user signs in/up — links any email-based pending invites to their account
export const claimPendingInvites = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const user = await ctx.db.get(userId);
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password"),
      )
      .first();
    const email = (user?.email ?? account?.providerAccountId ?? "").toLowerCase();
    if (!email) return;

    const emailInvites = await ctx.db
      .query("coachClients")
      .withIndex("by_invite_email", (q) => q.eq("inviteEmail", email))
      .collect();

    await Promise.all(
      emailInvites.map((rel) =>
        ctx.db.patch(rel._id, { clientId: userId, inviteEmail: undefined }),
      ),
    );
  },
});

export const declineInvite = mutation({
  args: { inviteId: v.id("coachClients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rel = await ctx.db.get(args.inviteId);
    if (!rel || rel.clientId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.inviteId);
  },
});

// ── Coach list (for clients) ──────────────────────────────────────────────────

export const getMyCoaches = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const relationships = await ctx.db
      .query("coachClients")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "pending"),
          q.neq(q.field("clientId"), undefined),
        )
      )
      .collect();

    return await Promise.all(
      relationships.map(async (rel) => {
        const user = await ctx.db.get(rel.coachId);
        const passwordAccount = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) =>
            q.eq("userId", rel.coachId).eq("provider", "password"),
          )
          .first();
        const email = user?.email ?? passwordAccount?.providerAccountId ?? null;
        return {
          id: rel.coachId,
          email,
          name: user?.name ?? null,
        };
      }),
    );
  },
});

// ── Client data access ────────────────────────────────────────────────────────

async function assertCoachOf(ctx: any, coachId: string, clientId: string) {
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

export const getClientEntries = query({
  args: {
    clientId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    try { await assertCoachOf(ctx, userId, args.clientId); } catch { return []; }

    const all = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", args.clientId))
      .order("desc")
      .collect();

    return all.filter((e) => {
      if (args.startDate && e.date < args.startDate) return false;
      if (args.endDate   && e.date > args.endDate)   return false;
      return true;
    });
  },
});

export const getClientPhotos = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    try { await assertCoachOf(ctx, userId, args.clientId); } catch { return []; }

    const rows = await ctx.db
      .query("photos")
      .withIndex("by_user", (q) => q.eq("userId", args.clientId))
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      })),
    );
  },
});
