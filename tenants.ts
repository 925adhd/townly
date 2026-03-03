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
    contactEmail: 'kara@925adhd.com',
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
};

function resolveTenantId(): string {
  // 1. Env var (set VITE_TENANT_ID in .env for local dev)
  const envId = (import.meta as any).env?.VITE_TENANT_ID as string | undefined;
  if (envId && TENANTS[envId]) return envId;

  // 2. Subdomain (e.g. grayscounty.townly.com → 'grayscounty')
  const subdomain = window.location.hostname.split('.')[0];
  if (TENANTS[subdomain]) return subdomain;

  // 3. Default
  return 'grayson';
}

export function getCurrentTenant(): TenantConfig {
  return TENANTS[resolveTenantId()];
}
