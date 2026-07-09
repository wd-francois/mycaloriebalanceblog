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

// Bounded to the most recent 200 messages — keeps the query and payload
// cheap for long-running coach/client relationships instead of an
// unbounded .collect() that grows forever.
const MESSAGE_HISTORY_LIMIT = 200;

export const list = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    await assertRelationship(ctx, userId, args.otherUserId);

    const cid = conversationId(userId, args.otherUserId);
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", cid))
      .order("desc")
      .take(MESSAGE_HISTORY_LIMIT);
    const msgs = recent.reverse();

    return await Promise.all(
      msgs.map(async (m) => ({
        ...m,
        url: m.storageId ? await ctx.storage.getUrl(m.storageId) : null,
      })),
    );
  },
});

// ── Conversation inbox ──────────────────────────────────────────────────────
// Role-agnostic: works for a coach (contacts = their clients) and a client
// (contacts = their coach(es)) via the same bidirectional relationship table,
// so both roles share one inbox implementation instead of two.

async function getContactIds(ctx: any, userId: string) {
  const asCoach = await ctx.db
    .query("coachClients")
    .withIndex("by_coach", (q: any) => q.eq("coachId", userId))
    .filter((q: any) =>
      q.and(q.neq(q.field("status"), "pending"), q.neq(q.field("clientId"), undefined)),
    )
    .collect();
  const asClient = await ctx.db
    .query("coachClients")
    .withIndex("by_client", (q: any) => q.eq("clientId", userId))
    .filter((q: any) => q.neq(q.field("status"), "pending"))
    .collect();

  const ids = new Set<string>();
  for (const rel of asCoach) if (rel.clientId) ids.add(rel.clientId);
  for (const rel of asClient) ids.add(rel.coachId);
  return [...ids];
}

export const listConversations = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const contactIds = await getContactIds(ctx, userId);

    const unreadMessages = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .filter((q) =>
        q.and(q.eq(q.field("type"), "message"), q.eq(q.field("readAt"), undefined)),
      )
      .collect();
    const unreadBySender = new Map<string, number>();
    for (const n of unreadMessages) {
      unreadBySender.set(n.senderId, (unreadBySender.get(n.senderId) ?? 0) + 1);
    }

    const conversations = await Promise.all(
      contactIds.map(async (contactId) => {
        const user = await ctx.db.get(contactId as any);
        const account = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) =>
            q.eq("userId", contactId as any).eq("provider", "password"),
          )
          .first();

        const cid = conversationId(userId, contactId);
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", cid))
          .order("desc")
          .first();

        return {
          id: contactId,
          name: (user as any)?.name ?? null,
          email: (user as any)?.email ?? account?.providerAccountId ?? null,
          lastMessagePreview: lastMessage
            ? lastMessage.text ?? (lastMessage.fileName ?? "Attachment")
            : null,
          lastMessageAt: lastMessage?._creationTime ?? null,
          lastMessageMine: lastMessage ? lastMessage.senderId === userId : false,
          unreadCount: unreadBySender.get(contactId) ?? 0,
        };
      }),
    );

    // Most recent conversation first; contacts with no messages yet go last.
    return conversations.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
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
