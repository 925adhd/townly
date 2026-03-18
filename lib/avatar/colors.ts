// Townly theme palette — pulled from Tailwind classes used across the app
const AVATAR_COLORS = [
  '#ea580c', // orange-600  (primary brand)
  '#c2410c', // orange-700
  '#d97706', // amber-600
  '#b45309', // amber-700
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  '#059669', // emerald-600
  '#047857', // emerald-700
  '#475569', // slate-600
  '#334155', // slate-700
  '#dc2626', // red-600
  '#0d9488', // teal-600
];

/** Deterministic color from a string seed (user ID). */
export function getColorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
