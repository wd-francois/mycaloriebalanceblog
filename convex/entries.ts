import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { notifyOnce } from "./lib";

// Optional fields a user can blank out when editing an entry, per type.
const CLEARABLE_FIELDS: Record<string, readonly string[]> = {
  meal: ["amount", "calories", "protein", "carbs", "fat", "fibre", "sodium", "other", "notes"],
  exercise: ["notes"],
  sleep: ["notes"],
  measurements: [
    "neck", "shoulders", "chest", "waist", "hips", "thigh", "arm", "calf",
    "chestSkinfold", "abdominalSkinfold", "thighSkinfold",
    "tricepSkinfold", "subscapularSkinfold", "suprailiacSkinfold",
    "notes",
  ],
};

export const list = query({
  args: {
    date: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let result = entries;
    if (args.date) result = result.filter((e) => e.date === args.date);
    if (args.type) result = result.filter((e) => e.type === args.type);

    return result.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const listByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return entries
      .filter((e) => e.date >= args.startDate && e.date <= args.endDate)
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const add = mutation({
  args: {
    type: v.union(
      v.literal("meal"),
      v.literal("exercise"),
      v.literal("activity"),
      v.literal("sleep"),
      v.literal("measurements")
    ),
    date: v.string(),
    time: v.optional(
      v.object({ hour: v.number(), minute: v.number(), period: v.string() })
    ),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Meal
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fibre: v.optional(v.number()),
    sodium: v.optional(v.number()),
    other: v.optional(v.string()),
    amount: v.optional(v.string()),
    mealNumber: v.optional(v.number()),
    // Exercise
    exercisesData: v.optional(v.string()),
    durationMinutes: v.optional(v.string()),
    distance: v.optional(v.string()),
    steps: v.optional(v.string()),
    // Sleep
    sleepStart: v.optional(v.string()),
    sleepEnd: v.optional(v.string()),
    sleepDuration: v.optional(v.number()),
    sleepQuality: v.optional(v.string()),
    bedtime: v.optional(v.object({ hour: v.number(), minute: v.number(), period: v.string() })),
    waketime: v.optional(v.object({ hour: v.number(), minute: v.number(), period: v.string() })),
    // Measurements
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.string()),
    neck: v.optional(v.number()),
    shoulders: v.optional(v.number()),
    chest: v.optional(v.number()),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    thigh: v.optional(v.number()),
    arm: v.optional(v.number()),
    calf: v.optional(v.number()),
    chestSkinfold: v.optional(v.number()),
    abdominalSkinfold: v.optional(v.number()),
    thighSkinfold: v.optional(v.number()),
    tricepSkinfold: v.optional(v.number()),
    subscapularSkinfold: v.optional(v.number()),
    suprailiacSkinfold: v.optional(v.number()),
    photoId: v.optional(v.id("photos")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entryId = await ctx.db.insert("entries", { ...args, userId });

    // Notify each coach — one unread notification per coach-client pair (coalesced)
    const relationships = await ctx.db
      .query("coachClients")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .collect();

    await Promise.all(
      relationships.map((rel) =>
        notifyOnce(ctx, { recipientId: rel.coachId, senderId: userId, type: "entry" })
      )
    );

    return entryId;
  },
});

export const update = mutation({
  args: {
    id: v.id("entries"),
    date: v.optional(v.string()), // "YYYY-MM-DD" — moves the entry to another day
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    time: v.optional(
      v.object({ hour: v.number(), minute: v.number(), period: v.string() })
    ),
    // Meal
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fibre: v.optional(v.number()),
    sodium: v.optional(v.number()),
    other: v.optional(v.string()),
    amount: v.optional(v.string()),
    mealNumber: v.optional(v.number()),
    // Exercise
    durationMinutes: v.optional(v.string()),
    distance: v.optional(v.string()),
    steps: v.optional(v.string()),
    exercisesData: v.optional(v.string()),
    // Sleep
    sleepStart: v.optional(v.string()),
    sleepEnd: v.optional(v.string()),
    sleepDuration: v.optional(v.number()),
    sleepQuality: v.optional(v.string()),
    bedtime: v.optional(v.object({ hour: v.number(), minute: v.number(), period: v.string() })),
    waketime: v.optional(v.object({ hour: v.number(), minute: v.number(), period: v.string() })),
    // Measurements
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.string()),
    neck: v.optional(v.number()),
    shoulders: v.optional(v.number()),
    chest: v.optional(v.number()),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    thigh: v.optional(v.number()),
    arm: v.optional(v.number()),
    calf: v.optional(v.number()),
    chestSkinfold: v.optional(v.number()),
    abdominalSkinfold: v.optional(v.number()),
    thighSkinfold: v.optional(v.number()),
    tricepSkinfold: v.optional(v.number()),
    subscapularSkinfold: v.optional(v.number()),
    suprailiacSkinfold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...patch } = args;
    const entry = await ctx.db.get(id);
    if (!entry || entry.userId !== userId) throw new Error("Not authorized");

    // The edit forms always send every field that has a value, so an optional
    // field missing from the args was cleared by the user — unset it instead
    // of silently keeping the old value.
    for (const field of CLEARABLE_FIELDS[entry.type] ?? []) {
      if (!(field in patch)) (patch as Record<string, unknown>)[field] = undefined;
    }

    // An attached photo is listed by date, so move it along with the entry.
    if (patch.date && patch.date !== entry.date && entry.photoId) {
      const photo = await ctx.db.get(entry.photoId);
      if (photo && photo.userId === userId) await ctx.db.patch(photo._id, { date: patch.date });
    }

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("entries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});
