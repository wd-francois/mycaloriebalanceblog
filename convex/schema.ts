import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  entries: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("meal"),
      v.literal("exercise"),
      v.literal("activity"),
      v.literal("sleep"),
      v.literal("measurements")
    ),
    date: v.string(), // "YYYY-MM-DD"
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
    mealNumber: v.optional(v.number()),
    // Exercise (stored as JSON string to allow flexible nested structure)
    exercisesData: v.optional(v.string()),
    // Activity
    durationMinutes: v.optional(v.string()),
    distance: v.optional(v.string()),
    steps: v.optional(v.string()),
    // Sleep
    sleepStart: v.optional(v.string()),
    sleepEnd: v.optional(v.string()),
    sleepDuration: v.optional(v.number()),
    sleepQuality: v.optional(v.string()),
    // Measurements
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_type_date", ["userId", "type", "date"]),

  userSettings: defineTable({
    userId: v.id("users"),
    calorieGoal: v.optional(v.number()),
    proteinGoal: v.optional(v.number()),
    weightGoal: v.optional(v.number()),
    weightUnit: v.optional(v.string()),
    theme: v.optional(v.string()),
  }).index("by_user", ["userId"]),
});
