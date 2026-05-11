import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Auto-verify email so no email provider is needed for sign-up
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string | undefined,
          emailVerificationTime: Date.now(),
        };
      },
    }),
  ],
});
