import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUnreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {
      total: 0,
      byClient: {} as Record<string, { entries: number; messages: number }>,
      byType: { entries: 0, messages: 0, comments: 0 },
    };

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .filter((q) => q.eq(q.field("readAt"), undefined))
      .collect();

    const byClient: Record<string, { entries: number; messages: number }> = {};
    const byType = { entries: 0, messages: 0, comments: 0 };

    for (const n of unread) {
      // byType counts — for clients (messages + comments from coaches)
      if (n.type === "entry")   byType.entries++;
      if (n.type === "message") byType.messages++;
      if (n.type === "comment") byType.comments++;

      // byClient counts — for coaches (entries + messages from clients)
      if (n.type === "entry" || n.type === "message") {
        const key = n.senderId;
        if (!byClient[key]) byClient[key] = { entries: 0, messages: 0 };
        if (n.type === "entry")   byClient[key].entries++;
        if (n.type === "message") byClient[key].messages++;
      }
    }

    return { total: unread.length, byClient, byType };
  },
});

export const markReadForClient = mutation({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("senderId"), args.clientId),
          q.eq(q.field("readAt"), undefined)
        )
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { readAt: Date.now() })));
  },
});

export const markReadByType = mutation({
  args: { type: v.union(v.literal("entry"), v.literal("message"), v.literal("comment")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), args.type),
          q.eq(q.field("readAt"), undefined)
        )
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { readAt: Date.now() })));
  },
});
