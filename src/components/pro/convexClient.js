import { ConvexReactClient } from 'convex/react';

// Shared singleton so every Pro React island (ProApp, ProNavStatus, ...) uses
// the exact same client/auth state instead of each standing up its own.
// ProNavStatus used to create its own client, and its independent auth
// handshake could briefly report "not signed in" even while ProApp's client
// already knew the user was authenticated — during that window it rendered
// a real <a href="/pro/"> link where the Messages button normally sits, and
// a tap there triggered a genuine full-page reload (surfacing as Convex's
// "leave site?" warning, and re-triggering the userSettings.get race that
// the Calorie Goal card had to be hardened against). One shared client means
// one shared, already-settled auth state everywhere on the page.
export const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);
