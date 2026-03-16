export interface TenantConfig {
  id: string;          // slug used as tenant_id in DB, e.g. 'grayscounty'
  name: string;        // short county name, e.g. 'Grayson County'
  displayName: string; // full app name, e.g. 'Grayson County Townly'
  tagline: string;     // hero heading
  region: string;      // full region string, e.g. 'Grayson County, Kentucky'
  towns: string[];     // town names for dropdowns
  contactEmail: string; // admin contact email for claims/updates
}

export const TENANTS: Record<string, TenantConfig> = {
  grayson: {
    id: 'grayson',
    name: 'Grayson County',
    displayName: 'Grayson County Townly',
    tagline: "Grayson County's Digital Front Porch",
    region: 'Grayson County, Kentucky',
    towns: ['Leitchfield', 'Clarkson', 'Caneyville', 'Big Clifty', 'Wax'],
    // Set VITE_CONTACT_EMAIL in your Vercel/local environment — never hardcode here.
    contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string) || '',
  },
  // Add new counties here, e.g.:
  // hardincounty: {
  //   id: 'hardincounty',
  //   name: 'Hardin County',
  //   displayName: 'Hardin County Townly',
  //   tagline: "Hardin County's Digital Front Porch",
  //   region: 'Hardin County, Kentucky',
  //   towns: ['Elizabethtown', 'Radcliff', 'Vine Grove', 'Cecilia'],
  // },
  //
  // ⚠️  BEFORE LAUNCHING A SECOND COUNTY — add tenant_id to SELECT RLS policies in Supabase.
  // Right now SELECT policies on public tables (providers, reviews, community_alerts, etc.)
  // do NOT filter by tenant_id, so a direct REST API call returns data from ALL counties.
  // The app filters correctly, but the raw API does not.
  // Fix: add `AND tenant_id = <tenant>` to every public SELECT policy, or use a Postgres
  // row-level default via a JWT claim. Ask Claude Code to do this — it knows the full list.
};

/**
 * Explicit whitelist of hostnames → tenant IDs.
 * Add new entries here when launching a new county — never derive tenant from
 * an unvalidated hostname string, which could be manipulated in non-standard
 * proxy/hosting setups.
 */
const HOSTNAME_TO_TENANT: Record<string, string> = {
  // Production
  'townly.us':          'grayson',
  'www.townly.us':      'grayson',
  'grayson.townly.us':  'grayson',
  // Local dev
  'localhost':          'grayson',
  '127.0.0.1':          'grayson',
  // Add new counties below, e.g.:
  // 'hardin.townly.us': 'hardincounty',
};

function resolveTenantId(): string {
  // 1. Env var (set VITE_TENANT_ID in .env for local dev)
  const envId = (import.meta as any).env?.VITE_TENANT_ID as string | undefined;
  if (envId && TENANTS[envId]) return envId;

  // 2. Whitelisted hostname — explicit map prevents tenant spoofing via unknown subdomains.
  const hostname = window.location.hostname;
  const fromHostname = HOSTNAME_TO_TENANT[hostname];
  if (fromHostname && TENANTS[fromHostname]) return fromHostname;

  // 3. Default — safe fallback to the primary tenant.
  return 'grayson';
}

export function getCurrentTenant(): TenantConfig {
  return TENANTS[resolveTenantId()];
}
