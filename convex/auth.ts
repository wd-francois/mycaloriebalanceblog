import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Auto-verify email so no email provider is needed for sign-up
      profile(params) {
        return {
          email: params.email as string,
          ...(params.name ? { name: params.name as string } : {}),
          emailVerificationTime: Date.now(),
        };
      },
    }),
  ],
  jwt: {
    customClaims: async (ctx, { userId }) => {
      const user = await ctx.db.get(userId);
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      return {
        email: user?.email ?? null,
        role: settings?.role ?? "client",
      };
    },
  },
});
