import { supabase } from './supabase';
import { Provider, Review, ReviewReply, LostFoundPost, RecommendationRequest, RecommendationResponse, ContentReport, ReportContentType, Category, Town, CostRange, LostFoundType, ListingClaim, CommunityEvent, CommunityAlert, SpotlightBooking, EarlyAccessRequest } from '../types';
import { getCurrentTenant } from '../tenants';

// ── Security helpers ──────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Validate an uploaded image file for type and size. */
function validateImageFile(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error('Image must be under 5MB.');
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Only JPEG, PNG, WebP, or GIF images are allowed.');
}

/** Trim and hard-cap a string to prevent oversized DB writes. */
function sanitize(input: string, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Reject strings that contain HTML tags.
 * React auto-escapes JSX, so stored HTML renders as plain text today,
 * but this prevents dirty data from leaking into emails, exports, or
 * future server-rendered contexts.
 */
function rejectHtml(input: string, fieldName = 'Field'): void {
  if (/<[a-z!/?]/i.test(input)) {
    throw new Error(`${fieldName} must not contain HTML.`);
  }
}

/**
 * Validate that the supplied town belongs to the current tenant's town list.
 * Prevents arbitrary strings being stored in the town column via API bypass.
 */
function validateTown(town: string): void {
  const tenant = getCurrentTenant();
  if (!town || !tenant.towns.includes(town)) {
    throw new Error('Invalid town selection.');
  }
}

/**
 * Shared password strength rules — enforced on sign-up and password change.
 */
function validatePasswordStrength(password: string): void {
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(password)) throw new Error('Password must contain at least one uppercase letter.');
  if (!/[0-9]/.test(password)) throw new Error('Password must contain at least one number.');
  if (!/[^A-Za-z0-9]/.test(password)) throw new Error('Password must contain at least one special character (e.g. ! @ # $).');
}

/**
 * Validate a URL string: must be http or https. Throws on invalid input.
 * Returns the normalised href so callers can store it safely.
 */
function validateUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error('Website/social URL must start with http:// or https://');
  }
  // Block private/loopback ranges to prevent SSRF if URLs are ever fetched server-side
  const host = url.hostname;
  if (
    host === 'localhost' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === '::1'
  ) {
    throw new Error('That URL is not allowed.');
  }
  if (url.href.length > 500) throw new Error('URL is too long (max 500 characters).');
  return url.href;
}

/**
 * Derive the file extension from the MIME type, never from the filename.
 * This prevents extension spoofing (e.g. evil.jpg.php).
 */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function safeImageExt(file: File): string {
  const ext = MIME_TO_EXT[file.type];
  if (!ext) throw new Error('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
  return ext;
}

/**
 * Verify the calling user is authenticated and has the admin role in the
 * profiles table. Returns the user's uid.
 *
 * NOTE: This is a client-side defence-in-depth guard. The primary enforcement
 * must be Row-Level Security policies in Supabase (see supabase/rls_policies.sql).
 */
async function requireAdmin(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (profile?.role !== 'admin') throw new Error('Admin access required.');
  return session.user.id;
}

/**
 * Verify the calling user is authenticated and has at least moderator role.
 * Returns the user's uid.
 */
async function requireModOrAdmin(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (!['admin', 'moderator'].includes(profile?.role ?? '')) throw new Error('Access denied.');
  return session.user.id;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function mapProvider(row: any): Provider {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Category,
    subcategory: row.subcategory ?? undefined,
    description: row.description ?? undefined,
    phone: row.phone ?? undefined,
    facebook: row.facebook ?? undefined,
    website: row.website ?? undefined,
    address: row.address ?? undefined,
    hours: row.hours ?? undefined,
    town: row.town as Town,
    averageRating: Number(row.average_rating) || 0,
    reviewCount: row.review_count || 0,
    hireAgainPercent: row.hire_again_percent || 0,
    image: row.image ?? undefined,
    createdAt: row.created_at,
    status: (row.status ?? 'approved') as 'pending' | 'approved' | 'rejected',
    claimStatus: (row.claim_status ?? 'unclaimed') as 'unclaimed' | 'claimed',
    claimedBy: row.claimed_by ?? undefined,
    listingTier: (row.listing_tier ?? 'none') as 'none' | 'standard' | 'featured' | 'spotlight',
    tags: row.tags ?? [],
  };
}

function mapClaim(row: any): ListingClaim {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name ?? '',
    userId: row.user_id,
    userName: row.user_name ?? '',
    userEmail: row.user_email ?? '',
    verificationMethod: row.verification_method as 'email' | 'phone' | 'manual',
    verificationDetail: row.verification_detail ?? '',
    proofUrl: row.proof_url ?? undefined,
    proofType: row.proof_type ?? undefined,
    status: row.status as 'pending' | 'approved' | 'rejected',
    createdAt: row.created_at,
  };
}

function mapReview(row: any): Review {
  return {
    id: row.id,
    providerId: row.provider_id,
    userId: row.user_id,
    userName: row.user_name,
    rating: row.rating,
    wouldHireAgain: row.would_hire_again,
    serviceDescription: row.service_description,
    costRange: row.cost_range as CostRange,
    reviewText: row.review_text,
    serviceDate: row.service_date,
    createdAt: row.created_at,
  };
}

function mapLostFound(row: any): LostFoundPost {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    type: row.type as LostFoundType,
    title: row.title,
    description: row.description,
    photoUrl: row.photo_url ?? undefined,
    locationDescription: row.location_description,
    town: row.town as Town,
    dateOccurred: row.date_occurred,
    contactMethod: row.contact_method,
    status: row.status as 'active' | 'resolved',
    createdAt: row.created_at,
  };
}

const SLUG_STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'i','me','my','we','our','you','your','he','his','she','her','it','its','they','their',
  'in','on','at','to','for','of','with','by','from','up','about','into','through',
  'and','or','but','nor','so','yet','not',
  'do','does','did','have','has','had','will','would','could','should','may','might',
  'who','what','where','when','how','which','that','this','these','those',
  'any','some','all','no','know','good','best','looking','anyone','someone',
  'can','need','want','find','get','like','use','make','go','see','one',
  'there','here','just','also','only','very','really','please','help','does',
]);

/** Convert a question title to a short, readable URL slug (max 8 meaningful words / 60 chars). */
function slugify(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0 && !SLUG_STOP_WORDS.has(w));
  // Take up to 8 meaningful words, hard-cap at 60 chars, strip trailing hyphen from cutoff
  return words.slice(0, 8).join('-').slice(0, 60).replace(/-+$/, '');
}

function mapRequest(row: any): RecommendationRequest {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    serviceNeeded: row.service_needed,
    description: row.description,
    town: row.town as Town,
    status: row.status as 'open' | 'resolved',
    responseCount: row.response_count || 0,
    createdAt: row.created_at,
    slug: row.slug ?? undefined,
    acceptedResponseId: row.accepted_response_id ?? undefined,
  };
}

// ── Providers ─────────────────────────────────────────────────────────────────

let _providersCache: Provider[] | null = null;

export async function fetchProviders(): Promise<Provider[]> {
  if (_providersCache) return _providersCache;
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(0, 4999);
  if (error) throw error;
  _providersCache = (data ?? []).map(mapProvider);
  return _providersCache;
}

export function prefetchProviders(): void {
  fetchProviders().catch(console.error);
}

export async function fetchProviderById(id: string): Promise<Provider | null> {
  if (_providersCache) {
    const hit = _providersCache.find(p => p.id === id);
    if (hit) return hit;
  }
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProvider(data) : null;
}

const _reviewsCache = new Map<string, Review[]>();

export async function fetchReviewsByProvider(providerId: string): Promise<Review[]> {
  if (_reviewsCache.has(providerId)) return _reviewsCache.get(providerId)!;
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('provider_id', providerId)
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const reviews = (data ?? []).map(mapReview);
  _reviewsCache.set(providerId, reviews);
  return reviews;
}

export function prefetchProviderDetail(id: string): void {
  fetchReviewsByProvider(id).catch(console.error);
}

export async function fetchPendingProviders(): Promise<Provider[]> {
  await requireAdmin();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProvider);
}

export async function approveProvider(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const { error } = await supabase
    .from('providers')
    .update({ status: 'approved' })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to approve provider.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'approve_provider', target_table: 'providers', target_id: id, tenant_id: getCurrentTenant().id });
}

export async function rejectProvider(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const { error } = await supabase
    .from('providers')
    .update({ status: 'rejected' })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to reject provider.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'reject_provider', target_table: 'providers', target_id: id, tenant_id: getCurrentTenant().id });
}

export async function deleteOwnReview(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
  _reviewsCache.clear();
}

export async function deleteReview(id: string): Promise<void> {
  const actorId = await requireModOrAdmin();
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to delete review.');
  _reviewsCache.clear();
  await supabase.from('audit_log').insert({ actor_id: actorId, action: 'delete_review', target_table: 'reviews', target_id: id, tenant_id: getCurrentTenant().id });
}

export async function deleteProvider(id: string): Promise<void> {
  const actorId = await requireModOrAdmin();
  const { error } = await supabase
    .from('providers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to delete provider.');
  await supabase.from('audit_log').insert({ actor_id: actorId, action: 'delete_provider', target_table: 'providers', target_id: id, tenant_id: getCurrentTenant().id });
}

export async function updateProvider(
  id: string,
  input: { name: string; category: Category; subcategory?: string; phone?: string; town: Town; facebook?: string; website?: string; description?: string; tags?: string[]; address?: string; hours?: string; image?: string; listingTier?: 'none' | 'standard' | 'featured' | 'spotlight' }
): Promise<Provider> {
  await requireModOrAdmin();
  const { error } = await supabase
    .from('providers')
    .update({
      name: sanitize(input.name, 200),
      category: input.category,
      subcategory: input.subcategory ? sanitize(input.subcategory, 100) : null,
      phone: input.phone ? sanitize(input.phone, 20) : null,
      town: input.town,
      facebook: input.facebook ? validateUrl(input.facebook) : null,
      website: input.website ? validateUrl(input.website) : null,
      description: input.description ? sanitize(input.description, 2000) : null,
      address: input.address ? sanitize(input.address, 300) : null,
      hours: input.hours ? sanitize(input.hours, 500) : null,
      image: input.image ? validateUrl(input.image) : null,
      ...(input.listingTier !== undefined && { listing_tier: input.listingTier }),
      ...(input.tags !== undefined && { tags: input.tags.map(t => sanitize(t, 50)).slice(0, 20) }),
    })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
  const { data, error: fetchError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id)
    .single();
  if (fetchError) throw fetchError;
  return mapProvider(data);
}

export async function lookupUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  await requireModOrAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function toggleClaimStatus(
  id: string,
  status: 'claimed' | 'unclaimed',
  ownerId?: string
): Promise<void> {
  await requireModOrAdmin();
  const { error } = await supabase
    .from('providers')
    .update({
      claim_status: status,
      claimed_by: status === 'claimed' ? (ownerId ?? null) : null,
    })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
}

export async function addProvider(
  input: { name: string; category: Category; subcategory?: string; phone?: string; address?: string; town: Town },
  userId: string
): Promise<Provider> {
  const name = sanitize(input.name, 200);
  if (!name) throw new Error('Business name is required.');
  validateTown(input.town);
  rejectHtml(name, 'Business name');
  if (input.address) rejectHtml(input.address, 'Address');
  const { data, error } = await supabase
    .from('providers')
    .insert({
      name,
      category: input.category,
      subcategory: input.subcategory ? sanitize(input.subcategory, 100) : null,
      phone: input.phone ? sanitize(input.phone, 20) : null,
      address: input.address ? sanitize(input.address, 300) : null,
      town: input.town,
      created_by: userId,
      status: 'pending',       // submissions go to admin queue — NOT auto-approved
      tenant_id: getCurrentTenant().id,
    })
    .select()
    .single();
  if (error) throw error;
  return mapProvider(data);
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false })
    .range(0, 999);
  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function addReview(
  input: {
    providerId: string;
    rating: number;
    wouldHireAgain: boolean;
    serviceDescription: string;
    costRange: CostRange;
    reviewText: string;
    serviceDate: string;
  },
  userId: string,
  userName: string
): Promise<Review> {
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const serviceDescription = sanitize(input.serviceDescription, 200);
  const reviewText = sanitize(input.reviewText, 2000);
  if (!serviceDescription) throw new Error('Service description is required.');
  if (!reviewText) throw new Error('Review text is required.');
  rejectHtml(serviceDescription, 'Service description');
  rejectHtml(reviewText, 'Review text');
  // Prevent owners from reviewing their own claimed listing.
  // tenant_id filter ensures cross-tenant UUIDs can't be used to bypass this check.
  const { data: provider } = await supabase
    .from('providers')
    .select('claimed_by')
    .eq('id', input.providerId)
    .eq('tenant_id', getCurrentTenant().id)
    .single();
  if (provider?.claimed_by && provider.claimed_by === userId) {
    throw new Error('You cannot review a listing you own.');
  }
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      provider_id: input.providerId,
      user_id: userId,
      user_name: sanitize(userName, 100),
      rating,
      would_hire_again: input.wouldHireAgain,
      service_description: serviceDescription,
      cost_range: input.costRange,
      review_text: reviewText,
      service_date: input.serviceDate,
      tenant_id: getCurrentTenant().id,
    })
    .select()
    .single();
  if (error) {
    if (error.message.includes('RATE_LIMIT_REVIEWS')) {
      throw new Error('You\'ve submitted too many reviews today. Please try again tomorrow.');
    }
    throw error;
  }
  // Provider stats (average_rating, review_count, hire_again_percent) are maintained
  // by the update_provider_stats DB trigger (SECURITY DEFINER) on reviews INSERT/UPDATE/DELETE.
  // No client-side recalculation needed.
  _reviewsCache.delete(input.providerId);

  return mapReview(data);
}

// ── Lost & Found ──────────────────────────────────────────────────────────────

export async function fetchLostFound(): Promise<LostFoundPost[]> {
  const { data, error } = await supabase
    .from('lost_found_posts')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false })
    .range(0, 499);
  if (error) throw error;
  return (data ?? []).map(mapLostFound);
}

export async function addLostFoundPost(
  input: {
    type: LostFoundType;
    title: string;
    description: string;
    locationDescription: string;
    town: Town;
    dateOccurred: string;
    contactMethod: string;
  },
  photoFile: File | null,
  userId: string,
  userName: string
): Promise<LostFoundPost> {
  const title = sanitize(input.title, 200);
  const description = sanitize(input.description, 2000);
  const locationDescription = sanitize(input.locationDescription, 500);
  const contactMethod = sanitize(input.contactMethod, 200);
  if (!title) throw new Error('Title is required.');
  if (!description) throw new Error('Description is required.');
  validateTown(input.town);
  rejectHtml(title, 'Title');
  rejectHtml(description, 'Description');
  rejectHtml(locationDescription, 'Location');

  let photoUrl: string | null = null;

  if (photoFile) {
    validateImageFile(photoFile);
    const ext = safeImageExt(photoFile);
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('lost-found-photos')
      .upload(path, photoFile, { upsert: false });
    if (uploadError) throw new Error('Photo upload failed. Please try again.');

    const { data: urlData } = supabase.storage
      .from('lost-found-photos')
      .getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from('lost_found_posts')
    .insert({
      user_id: userId,
      user_name: sanitize(userName, 100),
      type: input.type,
      title,
      description,
      photo_url: photoUrl,
      location_description: locationDescription,
      town: input.town,
      date_occurred: input.dateOccurred,
      contact_method: contactMethod,
      tenant_id: getCurrentTenant().id,
    })
    .select()
    .single();
  if (error) {
    if (error.message.includes('RATE_LIMIT_LOST_FOUND')) {
      throw new Error('You\'ve posted too many listings today. Please try again tomorrow.');
    }
    throw error;
  }
  return mapLostFound(data);
}

export async function updateLostFoundStatus(id: string, status: 'active' | 'resolved'): Promise<void> {
  if (!['active', 'resolved'].includes(status)) throw new Error('Invalid status value.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('lost_found_posts')
    .update({ status })
    .eq('id', id)
    .eq('user_id', session.user.id);
  if (error) throw error;
}

export async function updateLostFoundPost(
  id: string,
  input: {
    type: LostFoundType;
    title: string;
    description: string;
    locationDescription: string;
    town: Town;
    dateOccurred: string;
    contactMethod: string;
  }
): Promise<LostFoundPost> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { data, error } = await supabase
    .from('lost_found_posts')
    .update({
      type: input.type,
      title: sanitize(input.title, 200),
      description: sanitize(input.description, 2000),
      location_description: sanitize(input.locationDescription, 500),
      town: input.town,
      date_occurred: input.dateOccurred,
      contact_method: sanitize(input.contactMethod, 200),
    })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single();
  if (error) throw error;
  return mapLostFound(data);
}

export async function deleteLostFoundPost(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('lost_found_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
}

// ── Recommendations ───────────────────────────────────────────────────────────

export async function fetchRequests(): Promise<RecommendationRequest[]> {
  const { data, error } = await supabase
    .from('recommendation_requests')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false })
    .range(0, 499);
  if (error) throw error;
  return (data ?? []).map(mapRequest);
}

export async function addRequest(
  input: { serviceNeeded: string; description: string; town: Town },
  userId: string,
  userName: string
): Promise<RecommendationRequest> {
  const serviceNeeded = sanitize(input.serviceNeeded, 200);
  const description = sanitize(input.description, 1000);
  if (!serviceNeeded) throw new Error('Service type is required.');
  validateTown(input.town);
  rejectHtml(serviceNeeded, 'Service needed');
  rejectHtml(description, 'Description');

  // Generate a unique slug; fall back if title yields no meaningful words
  const baseSlug = slugify(serviceNeeded) || `community-question-${crypto.randomUUID().slice(0, 8)}`;
  let slug = baseSlug;
  const { data: existing } = await supabase
    .from('recommendation_requests')
    .select('id')
    .eq('slug', slug)
    .eq('tenant_id', getCurrentTenant().id)
    .maybeSingle();
  if (existing) {
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  const { data, error } = await supabase
    .from('recommendation_requests')
    .insert({
      user_id: userId,
      user_name: sanitize(userName, 100),
      service_needed: serviceNeeded,
      description,
      town: input.town,
      tenant_id: getCurrentTenant().id,
      slug,
    })
    .select()
    .single();
  if (error) {
    if (error.message.includes('RATE_LIMIT_REQUESTS')) {
      throw new Error('You\'ve posted too many questions today. Please try again tomorrow.');
    }
    throw error;
  }
  return mapRequest(data);
}

export async function fetchRequestBySlug(slug: string): Promise<RecommendationRequest | null> {
  const { data, error } = await supabase
    .from('recommendation_requests')
    .select('*')
    .eq('slug', slug)
    .eq('tenant_id', getCurrentTenant().id)
    .maybeSingle();
  if (error || !data) return null;
  return mapRequest(data);
}

export async function fetchResponsesByRequestId(requestId: string): Promise<RecommendationResponse[]> {
  const { data, error } = await supabase
    .from('recommendation_responses')
    .select('*')
    .eq('request_id', requestId)
    .order('vote_count', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapResponse);
}

export async function acceptResponse(requestId: string, responseId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('recommendation_requests')
    .update({ status: 'resolved', accepted_response_id: responseId })
    .eq('id', requestId)
    .eq('user_id', session.user.id);
  if (error) throw error;
}

export async function unresolveRequest(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('recommendation_requests')
    .update({ status: 'open', accepted_response_id: null })
    .eq('id', id)
    .eq('user_id', session.user.id);
  if (error) throw error;
}

export async function deleteRequest(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error, count } = await supabase
    .from('recommendation_requests')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
  if (count === 0) throw new Error('Request not found or permission denied.');
}

export async function updateResponse(id: string, recommendation: string): Promise<void> {
  const sanitized = sanitize(recommendation, 2000);
  if (!sanitized) throw new Error('Recommendation cannot be empty.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('recommendation_responses')
    .update({ recommendation: sanitized })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
}

export async function deleteResponse(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error, count } = await supabase
    .from('recommendation_responses')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
  if (count === 0) throw new Error('Response not found or permission denied.');
}

// ── Recommendation Responses ──────────────────────────────────────────────────

function mapResponse(row: any): RecommendationResponse {
  return {
    id: row.id,
    requestId: row.request_id,
    userId: row.user_id,
    userName: row.user_name,
    recommendation: row.recommendation,
    voteCount: row.vote_count || 0,
    createdAt: row.created_at,
    recommendedProviderId: row.recommended_provider_id ?? null,
  };
}

export async function fetchAllRecommendationResponses(): Promise<RecommendationResponse[]> {
  const { data, error } = await supabase
    .from('recommendation_responses')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapResponse);
}

export async function addResponse(
  requestId: string,
  recommendation: string,
  userId: string,
  userName: string,
  recommendedProviderId?: string | null
): Promise<RecommendationResponse> {
  const sanitizedRecommendation = sanitize(recommendation, 1000);
  if (!sanitizedRecommendation) throw new Error('Recommendation text is required.');
  const { data, error } = await supabase
    .from('recommendation_responses')
    .insert({
      request_id: requestId,
      user_id: userId,
      user_name: sanitize(userName, 100),
      recommendation: sanitizedRecommendation,
      tenant_id: getCurrentTenant().id,
      ...(recommendedProviderId ? { recommended_provider_id: recommendedProviderId } : {}),
    })
    .select()
    .single();
  if (error) {
    if (error.message.includes('RATE_LIMIT_RESPONSES')) {
      throw new Error('You\'ve posted too many responses today. Please try again tomorrow.');
    }
    throw error;
  }
  return mapResponse(data);
}

export async function fetchUserVotedResponseIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('recommendation_response_votes')
    .select('response_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.response_id);
}

export async function toggleResponseVote(
  responseId: string,
  userId: string,
  hasVoted: boolean
): Promise<number> {
  if (hasVoted) {
    const { error } = await supabase
      .from('recommendation_response_votes')
      .delete()
      .eq('response_id', responseId)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('recommendation_response_votes')
      .insert({ response_id: responseId, user_id: userId });
    if (error) throw error;
  }

  // Trigger handles vote_count update (SECURITY DEFINER).
  // Read the updated count directly from the response row.
  const { data, error: readError } = await supabase
    .from('recommendation_responses')
    .select('vote_count')
    .eq('id', responseId)
    .single();
  if (readError) throw readError;

  return data?.vote_count ?? 0;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  validatePasswordStrength(password);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: sanitize(name, 100) } },
  });
  if (error) throw error;
  return data.user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Generic error — prevents account enumeration via distinct error messages
  // (Supabase distinguishes "email not found" vs "wrong password" vs "not confirmed").
  if (error) throw new Error('Invalid email or password.');
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Content Reports ───────────────────────────────────────────────────────────

function mapReport(row: any): ContentReport {
  return {
    id: row.id,
    contentType: row.content_type as ReportContentType,
    contentId: row.content_id,
    contentTitle: row.content_title ?? '',
    reportedBy: row.reported_by,
    reportedByName: row.reported_by_name ?? 'Anonymous',
    reason: row.reason ?? '',
    createdAt: row.created_at,
  };
}

export async function submitReport(
  contentType: ReportContentType,
  contentId: string,
  contentTitle: string,
  reason: string
): Promise<void> {
  // Resolve identity from the server-side session — never trust caller-supplied IDs.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to report content.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single();
  const sanitizedReason = sanitize(reason, 1000);
  if (!sanitizedReason) throw new Error('Please provide a reason for your report.');
  const { error } = await supabase.from('content_reports').insert({
    content_type: contentType,
    content_id: contentId,
    content_title: sanitize(contentTitle, 200),
    reported_by: session.user.id,
    reported_by_name: sanitize(profile?.name ?? 'Anonymous', 100),
    reason: sanitizedReason,
    tenant_id: getCurrentTenant().id,
  });
  if (error) {
    if (error.message.includes('RATE_LIMIT_REPORTS')) {
      throw new Error('You\'ve submitted too many reports today. Please try again tomorrow.');
    }
    throw new Error('Failed to submit report. Please try again.');
  }
}

export async function fetchReports(): Promise<ContentReport[]> {
  await requireAdmin();
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReport);
}

export async function dismissReport(id: string): Promise<void> {
  await requireAdmin();
  // Scope delete to the admin's own tenant to prevent cross-tenant data deletion.
  const { error } = await supabase
    .from('content_reports')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to dismiss report.');
}

export async function removeContent(contentType: ReportContentType, contentId: string): Promise<void> {
  await requireAdmin();
  const tableMap: Record<ReportContentType, string> = {
    provider: 'providers',
    lost_found: 'lost_found_posts',
    recommendation_request: 'recommendation_requests',
    recommendation_response: 'recommendation_responses',
    community_event: 'community_events',
  };
  // Scope delete to the admin's own tenant to prevent cross-tenant data deletion.
  const { error } = await supabase
    .from(tableMap[contentType])
    .delete()
    .eq('id', contentId)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to remove content.');
}

// ── Listing Claims ─────────────────────────────────────────────────────────────

export async function uploadClaimProof(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in.');
  validateImageFile(file);
  const ext = safeImageExt(file);
  const path = `${session.user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('claim-proofs').upload(path, file, { upsert: false });
  if (error) throw new Error('Failed to upload proof image.');
  const { data } = supabase.storage.from('claim-proofs').getPublicUrl(path);
  return data.publicUrl;
}

export async function submitClaim(
  providerId: string,
  providerName: string,
  verificationMethod: 'email' | 'phone' | 'manual',
  verificationDetail: string,
  proofUrl?: string,
  proofType?: string
): Promise<void> {
  // Resolve identity from the server-side session — never trust caller-supplied IDs.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to claim a listing.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single();

  // Reject if this listing is already claimed.
  const { data: targetProvider } = await supabase
    .from('providers')
    .select('claim_status')
    .eq('id', providerId)
    .eq('tenant_id', getCurrentTenant().id)
    .maybeSingle();
  if (targetProvider?.claim_status === 'claimed') {
    throw new Error('This listing has already been claimed by a verified owner.');
  }

  // Reject if there is already a pending claim for this listing (prevents claim-queue flooding).
  const { data: existingPending } = await supabase
    .from('listing_claims')
    .select('id')
    .eq('provider_id', providerId)
    .eq('tenant_id', getCurrentTenant().id)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingPending) {
    throw new Error('This listing already has a claim under review. Please check back after the current claim is resolved.');
  }

  const sanitizedDetail = sanitize(verificationDetail, 500);
  if (!sanitizedDetail) throw new Error('Please provide verification details.');
  const { error } = await supabase.from('listing_claims').insert({
    provider_id: providerId,
    provider_name: sanitize(providerName, 200),
    user_id: session.user.id,
    user_name: sanitize(profile?.name ?? 'Unknown', 100),
    user_email: sanitize(session.user.email ?? '', 200),
    verification_method: verificationMethod,
    verification_detail: sanitizedDetail,
    proof_url: proofUrl ?? null,
    proof_type: proofType ?? null,
    status: 'pending',
    tenant_id: getCurrentTenant().id,
  });
  if (error) {
    if (error.message.includes('RATE_LIMIT_CLAIMS')) {
      throw new Error('You already have 3 pending claims. Please wait for those to be reviewed before submitting another.');
    }
    throw new Error('Failed to submit claim. Please try again.');
  }
}

export async function fetchPendingClaims(): Promise<ListingClaim[]> {
  await requireAdmin();
  const { data, error } = await supabase
    .from('listing_claims')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapClaim);
}

export async function approveClaim(claimId: string): Promise<void> {
  const adminId = await requireAdmin();
  // Fetch the claim scoped to this tenant — never trust caller-supplied IDs.
  const { data: claim, error: fetchError } = await supabase
    .from('listing_claims')
    .select('provider_id, user_id, status')
    .eq('id', claimId)
    .eq('tenant_id', getCurrentTenant().id)
    .single();
  if (fetchError || !claim) throw new Error('Claim not found.');
  if (claim.status !== 'pending') throw new Error('Only pending claims can be approved.');

  const { error: claimError } = await supabase
    .from('listing_claims')
    .update({ status: 'approved' })
    .eq('id', claimId)
    .eq('tenant_id', getCurrentTenant().id);
  if (claimError) throw new Error('Failed to approve claim.');

  const { error: providerError } = await supabase
    .from('providers')
    .update({ claim_status: 'claimed', claimed_by: claim.user_id })
    .eq('id', claim.provider_id)
    .eq('tenant_id', getCurrentTenant().id);
  if (providerError) throw new Error('Failed to update provider claim status.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'approve_claim', target_table: 'listing_claims', target_id: claimId, tenant_id: getCurrentTenant().id });
}

export async function rejectClaim(claimId: string): Promise<void> {
  const adminId = await requireAdmin();
  const { error } = await supabase
    .from('listing_claims')
    .update({ status: 'rejected' })
    .eq('id', claimId)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to reject claim.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'reject_claim', target_table: 'listing_claims', target_id: claimId, tenant_id: getCurrentTenant().id });
}

// ── Owner-Controlled Listing Updates ──────────────────────────────────────────

export async function updateOwnerListing(
  id: string,
  input: {
    description?: string;
    phone?: string;
    address?: string;
    hours?: string;
    facebook?: string;
    website?: string;
    image?: string;
    tags?: string[];
    town?: string;
  }
): Promise<Provider> {
  // Defence-in-depth: verify session and ownership before issuing the UPDATE.
  // The primary guard is the RLS policy (claimed_by = auth.uid()), but this
  // ensures a clear error message and avoids a silent RLS rejection.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to edit a listing.');
  const { data: existing, error: fetchErr } = await supabase
    .from('providers')
    .select('claimed_by')
    .eq('id', id)
    .single();
  if (fetchErr || !existing) throw new Error('Listing not found.');
  if (existing.claimed_by !== session.user.id) throw new Error('You do not own this listing.');

  if (input.town !== undefined) validateTown(input.town);
  if (input.description) rejectHtml(input.description, 'Description');

  const { error } = await supabase
    .from('providers')
    .update({
      description: input.description ? sanitize(input.description, 2000) : null,
      phone: input.phone ? sanitize(input.phone, 20) : null,
      address: input.address ? sanitize(input.address, 300) : null,
      hours: input.hours ? sanitize(input.hours, 500) : null,
      facebook: input.facebook ? validateUrl(input.facebook) : null,
      website: input.website ? validateUrl(input.website) : null,
      image: input.image ? validateUrl(input.image) : null,
      ...(input.town !== undefined && { town: input.town }),
      ...(input.tags !== undefined && { tags: input.tags.map(t => sanitize(t, 50)).slice(0, 20) }),
    })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id)
    .single();
  if (fetchError) throw fetchError;
  return mapProvider(data);
}

export async function uploadOwnerPhoto(providerId: string, userId: string, file: File): Promise<string> {
  validateImageFile(file);
  const ext = safeImageExt(file);
  const path = `${userId}/${providerId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('provider-photos')
    .upload(path, file, { upsert: true });
  if (uploadError) throw new Error('Photo upload failed. Please try again.');
  const { data } = supabase.storage.from('provider-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ── Review Replies ─────────────────────────────────────────────────────────────

function mapReviewReply(row: any): ReviewReply {
  return {
    id: row.id,
    reviewId: row.review_id,
    providerId: row.provider_id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    replyText: row.reply_text,
    createdAt: row.created_at,
    resolvedByReviewer: row.resolved_by_reviewer ?? null,
  };
}

export async function fetchReviewReplies(providerId: string): Promise<ReviewReply[]> {
  const { data, error } = await supabase
    .from('review_replies')
    .select('*')
    .eq('provider_id', providerId)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
  return (data ?? []).map(mapReviewReply);
}

export async function submitReviewReply(
  reviewId: string,
  providerId: string,
  ownerId: string,
  replyText: string
): Promise<ReviewReply> {
  // Resolve ownerName from the server-side session — never trust caller-supplied strings.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to reply.');
  if (session.user.id !== ownerId) throw new Error('Owner ID mismatch.');

  // Verify the caller actually owns THIS specific listing — prevents any claimed
  // owner from posting "Business Owner" replies on a competitor's reviews.
  const { data: providerCheck } = await supabase
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('claimed_by', session.user.id)
    .eq('tenant_id', getCurrentTenant().id)
    .maybeSingle();
  if (!providerCheck) throw new Error('You do not own this listing.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single();
  // Resolve display name: profile name → email prefix → fallback
  const resolvedName = profile?.name
    || session.user.email?.split('@')[0]
    || 'Business Owner';
  const sanitizedReply = sanitize(replyText, 1000);
  if (!sanitizedReply) throw new Error('Reply text is required.');
  const { data, error } = await supabase
    .from('review_replies')
    .insert({
      review_id: reviewId,
      provider_id: providerId,
      owner_id: ownerId,
      owner_name: sanitize(resolvedName, 100),
      reply_text: sanitizedReply,
      tenant_id: getCurrentTenant().id,
    })
    .select()
    .single();
  if (error) throw error;
  return mapReviewReply(data);
}

export async function markReplyResolution(replyId: string, resolved: boolean | null): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  // Verify the caller is the author of the review this reply belongs to.
  const { data: reply } = await supabase
    .from('review_replies')
    .select('review_id')
    .eq('id', replyId)
    .single();
  if (!reply) throw new Error('Reply not found.');
  const { data: review } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', reply.review_id)
    .single();
  if (!review) throw new Error('Review not found.');
  if (review.user_id !== session.user.id) throw new Error('Only the reviewer can mark this as resolved.');
  const { error } = await supabase
    .from('review_replies')
    .update({ resolved_by_reviewer: resolved })
    .eq('id', replyId)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
}

export async function updateReviewReply(replyId: string, replyText: string): Promise<void> {
  const sanitized = sanitize(replyText, 1000);
  if (!sanitized) throw new Error('Reply cannot be empty.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('review_replies')
    .update({ reply_text: sanitized })
    .eq('id', replyId)
    .eq('owner_id', session.user.id);
  if (error) throw error;
}

export async function deleteOwnReviewReply(replyId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { error } = await supabase
    .from('review_replies')
    .delete()
    .eq('id', replyId)
    .eq('owner_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to delete reply.');
}

export async function deleteReviewReply(replyId: string): Promise<void> {
  const actorId = await requireModOrAdmin();
  const { error } = await supabase
    .from('review_replies')
    .delete()
    .eq('id', replyId)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to delete reply.');
  await supabase.from('audit_log').insert({ actor_id: actorId, action: 'delete_review_reply', target_table: 'review_replies', target_id: replyId, tenant_id: getCurrentTenant().id });
}

// ── Update / Removal Request ───────────────────────────────────────────────────

export async function fetchFeaturedCount(category: string, town: string): Promise<number> {
  const { count, error } = await supabase
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('category', category)
    .eq('town', town)
    .eq('listing_tier', 'featured')
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw error;
  return count ?? 0;
}

export async function submitUpdateRequest(
  providerId: string,
  providerName: string,
  requestType: 'update' | 'removal',
  message: string
): Promise<void> {
  // Resolve identity from the server-side session — never trust caller-supplied IDs.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to submit a request.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single();
  const sanitizedMessage = sanitize(message, 1000);
  if (!sanitizedMessage) throw new Error('Please provide details for your request.');
  const { error } = await supabase.from('content_reports').insert({
    content_type: 'provider',
    content_id: providerId,
    content_title: sanitize(providerName, 200),
    reported_by: session.user.id,
    reported_by_name: sanitize(profile?.name ?? 'Anonymous', 100),
    reason: `[${requestType.toUpperCase()} REQUEST] ${sanitizedMessage}`,
    tenant_id: getCurrentTenant().id,
  });
  if (error) {
    if (error.message.includes('RATE_LIMIT_REPORTS')) {
      throw new Error('You\'ve submitted too many requests today. Please try again tomorrow.');
    }
    throw new Error('Failed to submit request. Please try again.');
  }
}

// ── Community Events ──────────────────────────────────────────────────────────

function mapCommunityEvent(row: any): CommunityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    location: row.location,
    town: row.town,
    photoUrl: row.photo_url ?? undefined,
    postType: (row.post_type ?? 'event') as CommunityEvent['postType'],
    status: row.status as 'pending' | 'approved' | 'rejected',
    createdAt: row.created_at,
  };
}

export async function fetchApprovedCommunityEvents(): Promise<CommunityEvent[]> {
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .eq('status', 'approved')
    .eq('tenant_id', getCurrentTenant().id)
    .order('event_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCommunityEvent);
}

export async function fetchPendingCommunityEvents(): Promise<CommunityEvent[]> {
  await requireAdmin();
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .eq('status', 'pending')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCommunityEvent);
}

export async function submitCommunityEvent(
  title: string,
  description: string,
  eventDate: string,
  location: string,
  town: string,
  postType: CommunityEvent['postType'] = 'event',
): Promise<CommunityEvent> {
  // Resolve identity from the server-side session — never trust caller-supplied IDs.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to submit an event.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single();
  const resolvedName = profile?.name || session.user.email?.split('@')[0] || 'Neighbor';
  const sanitizedTitle = sanitize(title, 200);
  const sanitizedDescription = sanitize(description, 2000);
  const sanitizedLocation = sanitize(location, 300);
  if (!sanitizedTitle) throw new Error('Event title is required.');
  if (!sanitizedDescription) throw new Error('Event description is required.');
  rejectHtml(sanitizedTitle, 'Title');
  rejectHtml(sanitizedDescription, 'Description');
  rejectHtml(sanitizedLocation, 'Location');
  const { data, error } = await supabase.from('community_events').insert({
    user_id: session.user.id,
    user_name: sanitize(resolvedName, 100),
    title: sanitizedTitle,
    description: sanitizedDescription,
    event_date: eventDate,
    location: sanitizedLocation,
    town: sanitize(town, 100),
    post_type: postType,
    tenant_id: getCurrentTenant().id,
    status: 'pending',
  }).select().single();
  if (error) {
    if (error.message.includes('RATE_LIMIT_EVENTS')) {
      throw new Error('You\'ve submitted too many events today. Please try again tomorrow.');
    }
    throw new Error('Failed to submit event. Please try again.');
  }
  return mapCommunityEvent(data);
}

export async function approveCommunityEvent(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const { error } = await supabase
    .from('community_events')
    .update({ status: 'approved' })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to approve event.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'approve_event', target_table: 'community_events', target_id: id, tenant_id: getCurrentTenant().id });
}

export async function rejectCommunityEvent(id: string, reason?: string): Promise<void> {
  const adminId = await requireAdmin();
  const { error } = await supabase
    .from('community_events')
    .update({ status: 'rejected', rejection_reason: reason || null })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to reject event.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'reject_event', target_table: 'community_events', target_id: id, tenant_id: getCurrentTenant().id });
}

export async function deleteCommunityEvent(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const { error } = await supabase
    .from('community_events')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to delete event.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'delete_event', target_table: 'community_events', target_id: id, tenant_id: getCurrentTenant().id });
}

export async function deleteOwnCommunityEvent(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated.');
  const { error } = await supabase
    .from('community_events')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to delete event.');
}

export async function flagCommunityEvent(id: string, title: string): Promise<void> {
  await submitReport('community_event', id, title, 'Flagged as inappropriate');
}

// ── Community Alerts ──────────────────────────────────────────────────────────

function mapCommunityAlert(row: any): CommunityAlert {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    icon: row.icon || 'fa-triangle-exclamation',
  };
}

export async function fetchActiveAlerts(): Promise<CommunityAlert[]> {
  const { data, error } = await supabase
    .from('community_alerts')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .is('dismissed_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCommunityAlert);
}

export async function reorderAlerts(ids: string[]): Promise<void> {
  await requireAdmin();
  const results = await Promise.all(
    ids.map((id, i) =>
      supabase.from('community_alerts').update({ position: i }).eq('id', id).eq('tenant_id', getCurrentTenant().id)
    )
  );
  const failed = results.find(r => r.error);
  if (failed?.error) throw new Error('Failed to reorder alerts.');
}

export async function createAlert(title: string, description: string, userId: string, icon = 'fa-triangle-exclamation'): Promise<CommunityAlert> {
  await requireAdmin();
  const sanitizedTitle = sanitize(title, 200);
  const sanitizedDescription = sanitize(description, 1000);
  if (!sanitizedTitle) throw new Error('Alert title is required.');
  if (!sanitizedDescription) throw new Error('Alert description is required.');
  const { data, error } = await supabase
    .from('community_alerts')
    .insert({
      title: sanitizedTitle,
      description: sanitizedDescription,
      created_by: userId,
      tenant_id: getCurrentTenant().id,
      icon,
    })
    .select()
    .single();
  if (error) throw new Error('Failed to create alert.');
  return mapCommunityAlert(data);
}

export async function dismissAlert(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const { error } = await supabase
    .from('community_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getCurrentTenant().id);
  if (error) throw new Error('Failed to dismiss alert.');
  await supabase.from('audit_log').insert({ actor_id: adminId, action: 'dismiss_alert', target_table: 'community_alerts', target_id: id, tenant_id: getCurrentTenant().id });
}

// ── Listing Analytics ─────────────────────────────────────────────────────────

export async function logListingView(providerId: string, userId?: string): Promise<void> {
  // Use user ID for authenticated users, otherwise a stable anonymous browser ID
  let sessionKey = userId ?? localStorage.getItem('townly_vid');
  if (!sessionKey) {
    sessionKey = crypto.randomUUID();
    localStorage.setItem('townly_vid', sessionKey);
  }

  // Prevent firing more than once per page session
  const dedupKey = `view_${providerId}_${sessionKey}`;
  if (sessionStorage.getItem(dedupKey)) return;
  sessionStorage.setItem(dedupKey, '1');

  await supabase.from('listing_views').upsert(
    { provider_id: providerId, tenant_id: getCurrentTenant().id, session_key: sessionKey },
    { onConflict: 'provider_id,session_key', ignoreDuplicates: true }
  );
}

export interface ListingStats {
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  monthly: { month: string; views: number }[];
}

export async function fetchListingStats(providerId: string): Promise<ListingStats> {
  // Only the claiming owner may read analytics for their listing.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
  if (!isAdmin) {
    const { data: provider } = await supabase
      .from('providers')
      .select('claimed_by')
      .eq('id', providerId)
      .eq('tenant_id', getCurrentTenant().id)
      .single();
    if (!provider || provider.claimed_by !== session.user.id) {
      throw new Error('You do not own this listing.');
    }
  }

  const now = new Date();

  const dayOfWeek = now.getDay();
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - daysToMon);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const { data, error } = await supabase
    .from('listing_views')
    .select('viewed_at')
    .eq('provider_id', providerId)
    .gte('viewed_at', twelveMonthsAgo.toISOString());
  if (error) throw error;

  let thisWeek = 0, lastWeek = 0, thisMonth = 0, lastMonth = 0;
  const monthlyCounts: Record<string, number> = {};

  for (const row of data ?? []) {
    const d = new Date(row.viewed_at);
    if (d >= thisWeekStart) thisWeek++;
    else if (d >= lastWeekStart && d < thisWeekStart) lastWeek++;
    if (d >= thisMonthStart) thisMonth++;
    else if (d >= lastMonthStart && d < thisMonthStart) lastMonth++;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyCounts[key] = (monthlyCounts[key] ?? 0) + 1;
  }

  const monthly: { month: string; views: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.push({ month: d.toLocaleString('default', { month: 'short' }), views: monthlyCounts[key] ?? 0 });
  }

  return { thisWeek, lastWeek, thisMonth, lastMonth, monthly };
}

// ── Paid Submissions (Spotlight / Featured) ───────────────────────────────────

/** Returns the Sunday (00:00 local) of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  return d;
}

/** Format a week-start Date as "Sun Mar 16 – Sat Mar 22, 2026" */
export function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = weekStart.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

/** Upload a spotlight/featured image. Returns public URL. */
export async function uploadSpotlightImage(file: File): Promise<string> {
  validateImageFile(file);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Authentication required.');
  const ext = safeImageExt(file);
  const path = `${session.user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('spotlight-images').upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('spotlight-images').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Fetch booked weeks for availability display.
 * Returns { spotlight: string[], featured: { week: string; count: number }[] }
 * where strings are ISO date strings of week_start.
 */
export async function fetchBookedWeeks(): Promise<{
  spotlight: string[];
  featured: { week: string; count: number }[];
}> {
  const tenant = getCurrentTenant();
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 6); // include weeks already in progress
  const { data, error } = await supabase
    .from('paid_submissions')
    .select('type, week_start')
    .eq('tenant_id', tenant.id)
    .neq('status', 'rejected')
    .gte('week_start', cutoff.toISOString().split('T')[0]);
  if (error) throw new Error(error.message);

  const spotlightWeeks: string[] = [];
  const featuredMap: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.type === 'spotlight') {
      spotlightWeeks.push(row.week_start);
    } else {
      featuredMap[row.week_start] = (featuredMap[row.week_start] ?? 0) + 1;
    }
  }
  const featured = Object.entries(featuredMap).map(([week, count]) => ({ week, count }));
  return { spotlight: spotlightWeeks, featured };
}

/** Fetch the current user's own spotlight/featured bookings, newest first. */
export async function fetchMyBookings(): Promise<SpotlightBooking[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const tenant = getCurrentTenant();
  const { data, error } = await supabase
    .from('paid_submissions')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('submitted_by', session.user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSpotlightBooking);
}

/** Fetch the current user's own lost & found posts, newest first. */
export async function fetchMyLostFound(): Promise<LostFoundPost[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase
    .from('lost_found_posts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLostFound);
}

/** Fetch the current user's own Ask the Community requests, newest first. */
export async function fetchMyRequests(): Promise<RecommendationRequest[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase
    .from('recommendation_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRequest);
}

/** Soft-delete the calling user's account and anonymize their content. */
export async function softDeleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_account');
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
}

/** Update the current user's email address. */
export async function updateEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: window.location.origin }
  );
  if (error) throw new Error(error.message);
}

/** Update the current user's password. */
export async function updatePassword(newPassword: string): Promise<void> {
  validatePasswordStrength(newPassword);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/** Fetch the current user's own community posts, newest first. */
export async function fetchMyPosts(): Promise<CommunityEvent[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCommunityEvent);
}

/** Fetch the provider claimed by the current user, if any. */
export async function fetchMyClaimedListing(): Promise<Provider | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('claimed_by', session.user.id)
    .eq('tenant_id', getCurrentTenant().id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapProvider(data);
}

/** Update the user's own pending booking (resets to pending_review for re-approval). */
export async function updateMyBooking(
  id: string,
  fields: {
    title: string; teaser?: string; description: string;
    eventDate?: string; eventTime?: string;
    location?: string; town?: string; tags?: string[];
    imageUrl?: string; thumbnailUrl?: string; flyerUrl?: string;
  },
): Promise<SpotlightBooking> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated.');
  const { data, error } = await supabase
    .from('paid_submissions')
    .update({
      title: sanitize(fields.title, 200),
      teaser: fields.teaser ? sanitize(fields.teaser, 120) : null,
      description: sanitize(fields.description, 600),
      event_date: fields.eventDate || null,
      event_time: fields.eventTime || null,
      location: fields.location ? sanitize(fields.location, 300) : null,
      town: fields.town ? sanitize(fields.town, 100) : null,
      tags: fields.tags ?? [],
      image_url: fields.imageUrl || null,
      thumbnail_url: fields.thumbnailUrl || null,
      flyer_url: fields.flyerUrl || null,
      status: 'pending_review',
    })
    .eq('id', id)
    .eq('submitted_by', session.user.id) // can only edit own bookings
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapSpotlightBooking(data);
}

// ── Stripe helpers ────────────────────────────────────────────────────────────

/** Creates a Stripe Checkout Session and returns the redirect URL + session ID. */
export async function createCheckoutSession(
  type: 'spotlight' | 'featured',
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string; sessionId: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated.');
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { type, successUrl, cancelUrl, tenantId: getCurrentTenant().id },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error('Failed to create checkout session. Please try again.');
  if (data?.error) throw new Error('Failed to create checkout session. Please try again.');
  return data as { url: string; sessionId: string };
}

/** Verifies a Stripe Checkout Session was paid. */
export async function verifyStripeSession(
  sessionId: string,
): Promise<{ paid: boolean; amountTotal: number; type: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated.');
  const { data, error } = await supabase.functions.invoke('verify-stripe-session', {
    body: { sessionId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { paid: boolean; amountTotal: number; type: string | null };
}

// ── Spotlight booking ─────────────────────────────────────────────────────────

/** Submit a spotlight or featured booking.
 *  Pass stripeSessionId once payment is verified — sets payment_status to 'paid'.
 *  Requires the stripe_session_id column to exist on paid_submissions:
 *    ALTER TABLE paid_submissions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
 */
export async function submitSpotlightBooking(
  type: 'spotlight' | 'featured',
  title: string,
  description: string,
  weekStart: string,
  eventDate: string,
  eventTime: string,
  location: string,
  town: string,
  contactName: string,
  contactEmail: string,
  contactPhone: string,
  imageUrl: string,
  thumbnailUrl?: string,
  flyerUrl?: string,
  tags?: string[],
  teaser?: string,
  stripeSessionId?: string,
  paymentStatus: 'pending' | 'paid' | 'unpaid' = 'paid',
): Promise<SpotlightBooking> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be logged in to submit a booking.');
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error('Invalid contact email address.');
  }
  const tenant = getCurrentTenant();

  const payload: Record<string, unknown> = {
    tenant_id: tenant.id,
    type,
    title: sanitize(title, 200),
    teaser: teaser ? sanitize(teaser, 120) : null,
    description: sanitize(description, 600),
    week_start: weekStart,
    event_date: eventDate || null,
    event_time: eventTime ? sanitize(eventTime, 50) : null,
    tags: tags ?? [],
    location: sanitize(location, 300),
    town: sanitize(town, 100),
    contact_name: sanitize(contactName, 100),
    contact_email: sanitize(contactEmail, 200),
    contact_phone: sanitize(contactPhone, 30),
    image_url: imageUrl ? validateUrl(imageUrl) : null,
    thumbnail_url: thumbnailUrl ? validateUrl(thumbnailUrl) : null,
    flyer_url: flyerUrl ? validateUrl(flyerUrl) : null,
    submitted_by: session.user.id,
    submitted_by_name: session.user.user_metadata?.full_name || session.user.email || 'Unknown',
    status: 'pending_review',
    payment_status: paymentStatus,
    ...(stripeSessionId ? { stripe_session_id: stripeSessionId } : {}),
  };

  // Idempotent: if this session was already saved (e.g. page refresh), return existing row
  if (stripeSessionId) {
    const { data: existing } = await supabase
      .from('paid_submissions')
      .select()
      .eq('stripe_session_id', stripeSessionId)
      .maybeSingle();
    if (existing) return mapSpotlightBooking(existing);
  }

  const { data, error } = await supabase.from('paid_submissions').insert(payload).select().single();
  if (error) {
    if (error.message.includes('paid_submissions_spotlight_week_unique')) {
      throw new Error('WEEK_TAKEN');
    }
    if (error.message.includes('FEATURED_WEEK_FULL')) {
      throw new Error('That week is fully booked for featured posts.');
    }
    if (error.message.includes('RATE_LIMIT_PAID_SUBMISSIONS')) {
      throw new Error('Too many bookings submitted today. Please try again tomorrow or contact support@townly.us.');
    }
    throw new Error(`Failed to save booking: ${error.message}`);
  }
  return mapSpotlightBooking(data);
}

/** Poll paid_submissions until the webhook flips payment_status to 'paid'.
 *  Returns the booking once confirmed, or null if not yet paid.
 *  Scoped to the calling user — prevents session ID enumeration by other users. */
export async function pollForBooking(sessionId: string): Promise<SpotlightBooking | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase
    .from('paid_submissions')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .eq('submitted_by', session.user.id)
    .eq('payment_status', 'paid')
    .maybeSingle();
  return data ? mapSpotlightBooking(data) : null;
}

/** Fetch approved submissions for the current week (public — used to render Events page). */
let _spotlightCache: SpotlightBooking[] | null = null;

export async function fetchCurrentWeekSubmissions(): Promise<SpotlightBooking[]> {
  if (_spotlightCache) return _spotlightCache;
  const tenant = getCurrentTenant();
  // Compute the current week's Sunday in Central Time (America/Chicago)
  // so the cutover always happens at exactly 12:00 AM CT, not the visitor's local time.
  const centralDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD
  const [y, m, d] = centralDateStr.split('-').map(Number);
  const centralDate = new Date(y, m - 1, d);
  centralDate.setDate(centralDate.getDate() - centralDate.getDay()); // rewind to Sunday
  const weekStart = centralDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const { data, error } = await supabase
    .from('paid_submissions')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('status', 'approved')
    .eq('week_start', weekStart)
    .order('type', { ascending: true }); // 'featured' before 'spotlight' alphabetically; reorder in UI
  if (error) throw new Error(error.message);
  _spotlightCache = (data ?? []).map(mapSpotlightBooking);
  return _spotlightCache;
}

export function prefetchCurrentWeekSubmissions(): void {
  fetchCurrentWeekSubmissions().catch(console.error);
}

const HOME_IMAGES = ['/images/lakebackground.webp', '/images/townly.webp'];
let _homeImagesReady = false;
const _homeImageCallbacks: Array<() => void> = [];

export function prefetchHomeImages(): void {
  if (_homeImagesReady) return;
  let loaded = 0;
  HOME_IMAGES.forEach(src => {
    const img = new Image();
    img.onload = img.onerror = () => {
      loaded++;
      if (loaded === HOME_IMAGES.length) {
        _homeImagesReady = true;
        _homeImageCallbacks.forEach(cb => cb());
        _homeImageCallbacks.length = 0;
      }
    };
    img.src = src;
  });
}

export function onHomeImagesReady(cb: () => void): void {
  if (_homeImagesReady) { cb(); return; }
  _homeImageCallbacks.push(cb);
}

/** Admin: fetch all non-rejected submissions ordered by week. */
export async function fetchSpotlightBookings(): Promise<SpotlightBooking[]> {
  await requireAdmin();
  const tenant = getCurrentTenant();
  const { data, error } = await supabase
    .from('paid_submissions')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('week_start', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSpotlightBooking);
}

/** Admin: approve or reject a submission, optionally adding notes. */
export async function updateSpotlightBookingStatus(
  id: string,
  status: 'approved' | 'rejected',
  adminNotes?: string,
): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('paid_submissions')
    .update({ status, admin_notes: adminNotes ?? null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSpotlightBooking(id: string): Promise<void> {
  const { error } = await supabase.from('paid_submissions').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSpotlightBooking(
  id: string,
  updates: {
    title?: string;
    teaser?: string;
    description?: string;
    eventDate?: string;
    eventTime?: string;
    tags?: string[];
    location?: string;
    town?: string;
    weekStart?: string;
    adminNotes?: string;
  }
): Promise<SpotlightBooking> {
  const payload: Record<string, any> = {};
  if (updates.title !== undefined) payload.title = sanitize(updates.title, 150);
  if (updates.teaser !== undefined) payload.teaser = updates.teaser ? sanitize(updates.teaser, 120) : null;
  if (updates.description !== undefined) payload.description = sanitize(updates.description, 600);
  if (updates.eventDate !== undefined) payload.event_date = updates.eventDate || null;
  if (updates.eventTime !== undefined) payload.event_time = updates.eventTime ? sanitize(updates.eventTime, 50) : null;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.location !== undefined) payload.location = sanitize(updates.location, 200);
  if (updates.town !== undefined) payload.town = updates.town;
  if (updates.weekStart !== undefined) payload.week_start = updates.weekStart;
  if (updates.adminNotes !== undefined) payload.admin_notes = sanitize(updates.adminNotes, 500);

  const { data, error } = await supabase.from('paid_submissions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapSpotlightBooking(data);
}

function mapSpotlightBooking(row: Record<string, any>): SpotlightBooking {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    title: row.title,
    teaser: row.teaser ?? undefined,
    description: row.description,
    eventDate: row.event_date ?? undefined,
    eventTime: row.event_time ?? undefined,
    tags: row.tags ?? [],
    location: row.location ?? undefined,
    town: row.town ?? undefined,
    imageUrl: row.image_url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    flyerUrl: row.flyer_url ?? undefined,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone ?? undefined,
    submittedBy: row.submitted_by ?? undefined,
    submittedByName: row.submitted_by_name ?? undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    stripeSessionId: row.stripe_session_id ?? undefined,
    weekStart: row.week_start,
    adminNotes: row.admin_notes ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Early Access Requests ────────────────────────────────────────────────────

export async function submitEarlyAccessRequest(providerId: string, providerName: string, category: string, contactEmail: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');
  const profile = await supabase.from('profiles').select('name').eq('id', user.id).single();
  const userName = profile.data?.name ?? 'Unknown';
  const { error } = await supabase.from('early_access_requests').insert({
    provider_id: providerId,
    provider_name: providerName,
    category,
    user_id: user.id,
    user_name: userName,
    contact_email: contactEmail,
    tenant_id: getCurrentTenant().id,
  });
  if (error) throw new Error('Failed to submit request.');
}

export async function fetchEarlyAccessRequests(): Promise<EarlyAccessRequest[]> {
  await requireAdmin();
  const { data, error } = await supabase
    .from('early_access_requests')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: true });
  if (error) throw new Error('Failed to fetch requests.');
  return (data ?? []).map(r => ({
    id: r.id,
    providerId: r.provider_id,
    providerName: r.provider_name,
    category: r.category,
    userId: r.user_id,
    userName: r.user_name,
    contactEmail: r.contact_email ?? '',
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function updateEarlyAccessStatus(id: string, status: EarlyAccessRequest['status'], providerId?: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('early_access_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error('Failed to update status.');
  if (status === 'approved' && providerId) {
    const { error: providerError } = await supabase
      .from('providers')
      .update({ listing_tier: 'featured' })
      .eq('id', providerId);
    if (providerError) throw new Error('Failed to upgrade provider tier.');
  }
}

export async function checkEarlyAccessRequest(providerId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('early_access_requests')
    .select('id')
    .eq('provider_id', providerId)
    .eq('user_id', user.id)
    .eq('tenant_id', getCurrentTenant().id)
    .maybeSingle();
  return !!data;
}

export async function deleteEarlyAccessRequest(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('early_access_requests')
    .delete()
    .eq('id', id);
  if (error) throw new Error('Failed to delete request.');
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

export type ActivityActionType =
  | 'review'
  | 'claim'
  | 'report'
  | 'event'
  | 'lost_found'
  | 'early_access';

export interface ActivityItem {
  id: string;
  actionType: ActivityActionType;
  userName: string;
  userId?: string;
  summary: string;
  detail?: string;
  createdAt: string;
  /** Optional badge label e.g. "5★", "pending", "spam" */
  badge?: string;
  badgeColor?: string;
}

export async function fetchActivityFeed(limit = 100): Promise<ActivityItem[]> {
  await requireAdmin();
  const tenant = getCurrentTenant().id;

  const [reviews, claims, reports, events, lostFound, earlyAccess] = await Promise.all([
    supabase
      .from('reviews')
      .select('id, user_name, user_id, rating, review_text, created_at, provider_id')
      .eq('tenant_id', tenant)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('listing_claims')
      .select('id, user_name, user_id, provider_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('content_reports')
      .select('id, user_name, user_id, reason, content_type, created_at')
      .eq('tenant_id', tenant)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('community_events')
      .select('id, submitted_by, title, status, created_at')
      .eq('tenant_id', tenant)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('lost_found_posts')
      .select('id, user_name, user_id, title, type, created_at')
      .eq('tenant_id', tenant)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('early_access_requests')
      .select('id, user_name, user_id, provider_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const items: ActivityItem[] = [];

  for (const row of reviews.data ?? []) {
    items.push({
      id: `review-${row.id}`,
      actionType: 'review',
      userName: row.user_name ?? 'Unknown',
      userId: row.user_id,
      summary: `Left a ${row.rating}-star review`,
      detail: row.review_text ? row.review_text.slice(0, 120) : undefined,
      createdAt: row.created_at,
      badge: `${row.rating}★`,
      badgeColor: row.rating >= 4 ? 'bg-emerald-100 text-emerald-700' : row.rating <= 2 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700',
    });
  }

  for (const row of claims.data ?? []) {
    items.push({
      id: `claim-${row.id}`,
      actionType: 'claim',
      userName: row.user_name ?? 'Unknown',
      userId: row.user_id,
      summary: `Submitted a claim for "${row.provider_name ?? 'Unknown listing'}"`,
      createdAt: row.created_at,
      badge: row.status,
      badgeColor: row.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : row.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700',
    });
  }

  for (const row of reports.data ?? []) {
    items.push({
      id: `report-${row.id}`,
      actionType: 'report',
      userName: row.user_name ?? 'Unknown',
      userId: row.user_id,
      summary: `Reported ${row.content_type ?? 'content'}`,
      detail: row.reason ? row.reason.slice(0, 120) : undefined,
      createdAt: row.created_at,
      badge: 'flagged',
      badgeColor: 'bg-red-100 text-red-600',
    });
  }

  for (const row of events.data ?? []) {
    items.push({
      id: `event-${row.id}`,
      actionType: 'event',
      userName: row.submitted_by ?? 'Unknown',
      summary: `Submitted event "${row.title ?? 'Untitled'}"`,
      createdAt: row.created_at,
      badge: row.status,
      badgeColor: row.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : row.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-700',
    });
  }

  for (const row of lostFound.data ?? []) {
    items.push({
      id: `lost-${row.id}`,
      actionType: 'lost_found',
      userName: row.user_name ?? 'Unknown',
      userId: row.user_id,
      summary: `Posted ${row.type === 'found' ? 'Found' : 'Lost'} item: "${row.title ?? 'Untitled'}"`,
      createdAt: row.created_at,
      badge: row.type,
      badgeColor: row.type === 'found' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700',
    });
  }

  for (const row of earlyAccess.data ?? []) {
    items.push({
      id: `access-${row.id}`,
      actionType: 'early_access',
      userName: row.user_name ?? 'Unknown',
      userId: row.user_id,
      summary: `Requested early access for "${row.provider_name ?? 'Unknown'}"`,
      createdAt: row.created_at,
      badge: row.status,
      badgeColor: row.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, limit);
}

// ── Owner Updates ─────────────────────────────────────────────────────────────

export async function fetchOwnerUpdate(providerId: string): Promise<import('../types').OwnerUpdate | null> {
  const { data, error } = await supabase
    .from('owner_updates')
    .select('id, provider_id, content, updated_at')
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, providerId: data.provider_id, content: data.content, updatedAt: data.updated_at };
}

export async function upsertOwnerUpdate(providerId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('owner_updates')
    .upsert(
      { provider_id: providerId, content: content.trim(), tenant_id: getCurrentTenant().id, updated_at: new Date().toISOString() },
      { onConflict: 'provider_id' }
    );
  if (error) throw error;
}

export async function deleteOwnerUpdate(providerId: string): Promise<void> {
  const { error } = await supabase
    .from('owner_updates')
    .delete()
    .eq('provider_id', providerId);
  if (error) throw error;
}
