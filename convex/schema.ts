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
    fibre: v.optional(v.number()),
    other: v.optional(v.string()),
    amount: v.optional(v.string()),
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
    role: v.optional(v.union(v.literal("client"), v.literal("coach"))),
  }).index("by_user", ["userId"]),

  coachClients: defineTable({
    coachId: v.id("users"),
    // undefined for pre-signup invites (stored by email only until client signs up)
    clientId: v.optional(v.id("users")),
    // email used when the client doesn't have an account yet
    inviteEmail: v.optional(v.string()),
    // undefined = legacy accepted record; "pending" = awaiting client approval
    status: v.optional(v.union(v.literal("pending"), v.literal("accepted"))),
  })
    .index("by_coach", ["coachId"])
    .index("by_client", ["clientId"])
    .index("by_invite_email", ["inviteEmail"]),

  comments: defineTable({
    authorId: v.id("users"),
    targetUserId: v.id("users"),
    entryId: v.optional(v.id("entries")),
    photoId: v.optional(v.id("photos")),
    date: v.string(),
    text: v.string(),
  })
    .index("by_target_user", ["targetUserId"])
    .index("by_entry", ["entryId"])
    .index("by_photo", ["photoId"]),

  photos: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    date: v.string(), // "YYYY-MM-DD"
    caption: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  messages: defineTable({
    conversationId: v.string(), // [userId1, userId2].sort().join('|')
    senderId: v.id("users"),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
  }).index("by_conversation", ["conversationId"]),

  programs: defineTable({
    coachId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    // JSON array of { name, sets, reps, weight, notes }
    exercises: v.string(),
  }).index("by_coach", ["coachId"]),

  programAssignments: defineTable({
    programId: v.id("programs"),
    clientId: v.id("users"),
    coachId: v.id("users"),
  })
    .index("by_client", ["clientId"])
    .index("by_program", ["programId"]),

  notifications: defineTable({
    recipientId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(v.literal("entry"), v.literal("message"), v.literal("comment")),
    readAt: v.optional(v.number()),
  }).index("by_recipient", ["recipientId"]),
});
