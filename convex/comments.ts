import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertCoachOf, notifyOnce } from "./lib";

// Bounded to the most recent 300 comments — same rationale as messages.ts's
// MESSAGE_HISTORY_LIMIT: keeps the query cheap for long-running coach/client
// relationships instead of an unbounded .collect() that grows forever.
const COMMENT_HISTORY_LIMIT = 300;

export const listForClient = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Callers may view their own comments, or a coach may view comments
    // for one of their linked clients — nobody else.
    if (userId !== args.targetUserId) {
      try { await assertCoachOf(ctx, userId, args.targetUserId); } catch (e) { console.warn("assertCoachOf denied:", e); return []; }
    }

    const recent = await ctx.db
      .query("comments")
      .withIndex("by_target_user", (q) =>
        q.eq("targetUserId", args.targetUserId),
      )
      .order("desc")
      .take(COMMENT_HISTORY_LIMIT);
    return recent.reverse();
  },
});

// Client calls this to see comments their coach(es) have left about them
export const listMyCoachComments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const recent = await ctx.db
      .query("comments")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", userId))
      .order("desc")
      .take(COMMENT_HISTORY_LIMIT);
    return recent.reverse();
  },
});

// Two kinds of author are allowed:
//  - a coach commenting on a linked client's entry, photo, or day (notifies the client)
//  - a client commenting on their own workout: either on one exercise entry
//    (entryId) or on the whole day's session with no entryId — the "final
//    comment" left when logging a workout (notifies each of their coaches)
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

    const text = args.text.trim();
    if (!text) throw new Error("Comment cannot be empty");

    if (userId === args.targetUserId) {
      // Clients can't comment on photos; with no entryId this is a day-level
      // workout comment, otherwise it must be their own exercise entry.
      if (args.photoId) throw new Error("Not authorized");
      if (args.entryId) {
        const entry = await ctx.db.get(args.entryId);
        if (!entry || entry.userId !== userId) throw new Error("Not authorized");
        if (entry.type !== "exercise") throw new Error("Comments are only available on workout entries");
      }

      const commentId = await ctx.db.insert("comments", { authorId: userId, ...args, text });

      // Notify each coach — coalesced so only one unread comment notification per coach at a time
      const relationships = await ctx.db
        .query("coachClients")
        .withIndex("by_client", (q) => q.eq("clientId", userId))
        .filter((q) => q.neq(q.field("status"), "pending"))
        .collect();
      await Promise.all(
        relationships.map((rel) =>
          notifyOnce(ctx, { recipientId: rel.coachId, senderId: userId, type: "comment" })
        )
      );

      return commentId;
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings?.role !== "coach") throw new Error("Not authorized");

    await assertCoachOf(ctx, userId, args.targetUserId);

    const commentId = await ctx.db.insert("comments", { authorId: userId, ...args, text });

    // Notify the client — coalesced so only one unread comment notification at a time
    await notifyOnce(ctx, { recipientId: args.targetUserId, senderId: userId, type: "comment" });

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
