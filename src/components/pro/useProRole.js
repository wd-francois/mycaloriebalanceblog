import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Caches the resolved role in localStorage so nav/UI that depends on role
// doesn't flash to the wrong state while the Convex query is in-flight or
// on remount. Mirrors the pattern already duplicated between ProApp.jsx's
// resolveRole() and ProDashboardButton.jsx.
const ROLE_KEY = 'mcb_pro_role';

/** @returns {'coach' | 'client' | null} */
export function useProRole() {
  const serverRole = useQuery(api.coaches.getRole);

  if (serverRole) {
    try { localStorage.setItem(ROLE_KEY, serverRole); } catch {}
    return serverRole;
  }
  try { return localStorage.getItem(ROLE_KEY); } catch { return null; }
}

export function useIsCoach() {
  return useProRole() === 'coach';
}
