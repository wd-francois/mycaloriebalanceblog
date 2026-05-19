import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Returns a short-lived URL the client POSTs the file body to directly.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// Save photo metadata after a successful upload.
export const save = mutation({
  args: {
    storageId: v.id("_storage"),
    date: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("photos", { userId, ...args });
  },
});

// List all photos for the authenticated user, newest first.
// Optionally filter by date (YYYY-MM-DD).
export const list = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = args.date
      ? await ctx.db
          .query("photos")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", userId).eq("date", args.date!),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("photos")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .order("desc")
          .collect();

    // Resolve storage URLs server-side so the client gets plain img src strings.
    return await Promise.all(
      rows.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      })),
    );
  },
});

// Delete a photo record and its underlying file from storage.
export const remove = mutation({
  args: { id: v.id("photos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const photo = await ctx.db.get(args.id);
    if (!photo || photo.userId !== userId) throw new Error("Not authorized");

    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(args.id);
  },
});
