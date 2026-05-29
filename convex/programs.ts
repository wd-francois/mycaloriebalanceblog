import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertCoach(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (settings?.role !== "coach") throw new Error("Not a coach");
  return userId;
}

// ── Coach: CRUD ───────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_coach", (q) => q.eq("coachId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      programs.map(async (p) => {
        const assignments = await ctx.db
          .query("programAssignments")
          .withIndex("by_program", (q) => q.eq("programId", p._id))
          .collect();
        const clients = await Promise.all(
          assignments.map(async (a) => {
            const user = await ctx.db.get(a.clientId);
            return { id: a.clientId, name: user?.name ?? user?.email ?? "Unknown" };
          }),
        );
        return { ...p, assignedTo: clients };
      }),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    exercises: v.string(),
  },
  handler: async (ctx, args) => {
    const coachId = await assertCoach(ctx);
    return await ctx.db.insert("programs", {
      coachId,
      name: args.name,
      description: args.description,
      exercises: args.exercises,
    });
  },
});

export const update = mutation({
  args: {
    programId: v.id("programs"),
    name: v.string(),
    description: v.optional(v.string()),
    exercises: v.string(),
  },
  handler: async (ctx, args) => {
    const coachId = await assertCoach(ctx);
    const program = await ctx.db.get(args.programId);
    if (!program || program.coachId !== coachId) throw new Error("Not authorized");
    await ctx.db.patch(args.programId, {
      name: args.name,
      description: args.description,
      exercises: args.exercises,
    });
  },
});

export const remove = mutation({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    const coachId = await assertCoach(ctx);
    const program = await ctx.db.get(args.programId);
    if (!program || program.coachId !== coachId) throw new Error("Not authorized");
    // Remove all assignments first
    const assignments = await ctx.db
      .query("programAssignments")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .collect();
    await Promise.all(assignments.map((a) => ctx.db.delete(a._id)));
    await ctx.db.delete(args.programId);
  },
});

// ── Coach: Assignment ─────────────────────────────────────────────────────────

export const assign = mutation({
  args: { programId: v.id("programs"), clientId: v.id("users") },
  handler: async (ctx, args) => {
    const coachId = await assertCoach(ctx);
    const program = await ctx.db.get(args.programId);
    if (!program || program.coachId !== coachId) throw new Error("Not authorized");

    const existing = await ctx.db
      .query("programAssignments")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .first();
    if (existing) return; // already assigned

    await ctx.db.insert("programAssignments", {
      programId: args.programId,
      clientId: args.clientId,
      coachId,
    });
  },
});

export const unassign = mutation({
  args: { programId: v.id("programs"), clientId: v.id("users") },
  handler: async (ctx, args) => {
    const coachId = await assertCoach(ctx);
    const assignment = await ctx.db
      .query("programAssignments")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .first();
    if (!assignment || assignment.coachId !== coachId) throw new Error("Not authorized");
    await ctx.db.delete(assignment._id);
  },
});

// ── Client: Get assigned programs ─────────────────────────────────────────────

export const getMyPrograms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const assignments = await ctx.db
      .query("programAssignments")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .collect();

    return await Promise.all(
      assignments.map(async (a) => {
        const program = await ctx.db.get(a.programId);
        if (!program) return null;
        const coach = await ctx.db.get(program.coachId);
        return {
          ...program,
          coachName: coach?.name ?? coach?.email ?? "Your coach",
        };
      }),
    ).then((results) => results.filter(Boolean));
  },
});
