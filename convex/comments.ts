import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listForClient = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("comments")
      .withIndex("by_target_user", (q) =>
        q.eq("targetUserId", args.targetUserId),
      )
      .order("asc")
      .collect();
  },
});

// Client calls this to see comments their coach(es) have left about them
export const listMyCoachComments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("comments")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", userId))
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: {
    targetUserId: v.id("users"),
    text: v.string(),
    date: v.string(),
    entryId: v.optional(v.id("entries")),
    photoId: v.optional(v.id("photos")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings?.role !== "coach") throw new Error("Not authorized");

    const rel = await ctx.db
      .query("coachClients")
      .withIndex("by_coach", (q) => q.eq("coachId", userId))
      .filter((q) => q.eq(q.field("clientId"), args.targetUserId))
      .first();
    if (!rel) throw new Error("Not authorized");

    const commentId = await ctx.db.insert("comments", { authorId: userId, ...args });

    // Notify the client — coalesced so only one unread comment notification at a time
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.targetUserId))
      .filter((q) =>
        q.and(
          q.eq(q.field("senderId"), userId),
          q.eq(q.field("type"), "comment"),
          q.eq(q.field("readAt"), undefined)
        )
      )
      .first();
    if (!existing) {
      await ctx.db.insert("notifications", {
        recipientId: args.targetUserId,
        senderId: userId,
        type: "comment",
      });
    }

    return commentId;
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment || comment.authorId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});
