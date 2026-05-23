import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function conversationId(a: string, b: string) {
  return [a, b].sort().join("|");
}

async function assertRelationship(ctx: any, userId: string, otherId: string) {
  const asCoach = await ctx.db
    .query("coachClients")
    .withIndex("by_coach", (q: any) => q.eq("coachId", userId))
    .filter((q: any) => q.eq(q.field("clientId"), otherId))
    .first();
  if (asCoach) return;

  const asClient = await ctx.db
    .query("coachClients")
    .withIndex("by_coach", (q: any) => q.eq("coachId", otherId))
    .filter((q: any) => q.eq(q.field("clientId"), userId))
    .first();
  if (!asClient) throw new Error("Not authorized");
}

export const list = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    await assertRelationship(ctx, userId, args.otherUserId);

    const cid = conversationId(userId, args.otherUserId);
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", cid))
      .order("asc")
      .collect();

    return await Promise.all(
      msgs.map(async (m) => ({
        ...m,
        url: m.storageId ? await ctx.storage.getUrl(m.storageId) : null,
      })),
    );
  },
});

export const send = mutation({
  args: {
    receiverId: v.id("users"),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await assertRelationship(ctx, userId, args.receiverId);

    if (!args.text && !args.storageId) throw new Error("Message must have text or a file");

    const cid = conversationId(userId, args.receiverId);
    const msgId = await ctx.db.insert("messages", {
      conversationId: cid,
      senderId: userId,
      text: args.text,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
    });

    // Notify receiver — coalesced so only one unread message notification at a time
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.receiverId))
      .filter((q) =>
        q.and(
          q.eq(q.field("senderId"), userId),
          q.eq(q.field("type"), "message"),
          q.eq(q.field("readAt"), undefined)
        )
      )
      .first();
    if (!existing) {
      await ctx.db.insert("notifications", {
        recipientId: args.receiverId,
        senderId: userId,
        type: "message",
      });
    }

    return msgId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const remove = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const msg = await ctx.db.get(args.id);
    if (!msg || msg.senderId !== userId) throw new Error("Not authorized");

    if (msg.storageId) await ctx.storage.delete(msg.storageId);
    await ctx.db.delete(args.id);
  },
});
