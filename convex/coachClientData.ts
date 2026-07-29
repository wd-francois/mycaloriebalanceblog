import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertCoachOf } from "./lib";

// ── Client data access (coach reading a linked client's data) ────────────────
// Split out of coaches.ts, which mixed this with invite/relationship
// lifecycle management — these two queries are read-only and unrelated to
// how the coach/client link itself gets created, accepted, or removed.

export const getClientEntries = query({
  args: {
    clientId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    try { await assertCoachOf(ctx, userId, args.clientId); } catch (e) { console.warn("assertCoachOf denied:", e); return []; }

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

    try { await assertCoachOf(ctx, userId, args.clientId); } catch (e) { console.warn("assertCoachOf denied:", e); return []; }

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
