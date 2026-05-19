import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);

    // email embedded in JWT via customClaims (populated on next sign-in / token refresh)
    const identity = await ctx.auth.getUserIdentity();

    // password provider stores the email as providerAccountId
    const passwordAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password"),
      )
      .first();

    const email =
      user?.email ??
      identity?.email ??
      passwordAccount?.providerAccountId ??
      null;

    return { _id: userId, email, name: user?.name ?? null };
  },
});

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { name: args.name.trim() || undefined });
  },
});
