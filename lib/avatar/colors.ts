// Townly theme palette — orange & blue dominant, warm accents
const AVATAR_COLORS = [
  '#ea580c', // orange-600 (primary brand)
  '#c2410c', // orange-700
  '#f97316', // orange-500
  '#d97706', // amber-600
  '#9a3412', // orange-800
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  '#3b82f6', // blue-500
  '#1e40af', // blue-800
  '#7f1d1d', // burgundy
  '#78350f', // warm brown
  '#475569', // slate-600
];

/** Deterministic color from a string seed (user ID). */
export function getColorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
