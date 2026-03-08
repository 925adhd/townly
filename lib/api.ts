import { supabase } from './supabase';
import { Provider, Review, ReviewReply, LostFoundPost, RecommendationRequest, RecommendationResponse, ContentReport, ReportContentType, Category, Town, CostRange, LostFoundType, ListingClaim, CommunityEvent, CommunityAlert } from '../types';
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
 * Validate a URL string: must be http or https. Throws on invalid input.
 * Returns the normalised href so callers can store it safely.
 */
function validateUrl(raw: string): string {
  let href: string;
  try {
    const url = new URL(raw.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    href = url.href;
  } catch {
    throw new Error('Website/social URL must start with http:// or https://');
  }
  if (href.length > 500) throw new Error('URL is too long (max 500 characters).');
  return href;
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
  };
}

// ── Providers ─────────────────────────────────────────────────────────────────

export async function fetchProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(0, 4999);
  if (error) throw error;
  return (data ?? []).map(mapProvider);
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
  await requireAdmin();
  const { error } = await supabase
    .from('providers')
    .update({ status: 'approved' })
    .eq('id', id);
  if (error) throw new Error('Failed to approve provider.');
}

export async function rejectProvider(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('providers')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) throw new Error('Failed to reject provider.');
}

export async function deleteReview(id: string): Promise<void> {
  await requireModOrAdmin();
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id);
  if (error) throw new Error('Failed to delete review.');
}

export async function deleteProvider(id: string): Promise<void> {
  await requireModOrAdmin();
  const { error } = await supabase
    .from('providers')
    .delete()
    .eq('id', id);
  if (error) throw new Error('Failed to delete provider.');
}

export async function updateProvider(
  id: string,
  input: { name: string; category: Category; subcategory?: string; phone?: string; town: Town; facebook?: string; website?: string }
): Promise<Provider> {
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
    })
    .eq('id', id);
  if (error) throw error;
  // Fetch the updated row separately to avoid RLS read-back issues with .single()
  const { data, error: fetchError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  return mapProvider(data);
}

export async function addProvider(
  input: { name: string; category: Category; subcategory?: string; phone?: string; town: Town },
  userId: string
): Promise<Provider> {
  const name = sanitize(input.name, 200);
  if (!name) throw new Error('Business name is required.');
  const { data, error } = await supabase
    .from('providers')
    .insert({
      name,
      category: input.category,
      subcategory: input.subcategory ? sanitize(input.subcategory, 100) : null,
      phone: input.phone ? sanitize(input.phone, 20) : null,
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
  if (error) throw error;
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
  if (error) throw error;
  return mapLostFound(data);
}

export async function updateLostFoundStatus(id: string, status: 'active' | 'resolved'): Promise<void> {
  const { error } = await supabase
    .from('lost_found_posts')
    .update({ status })
    .eq('id', id);
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
    .select()
    .single();
  if (error) throw error;
  return mapLostFound(data);
}

export async function deleteLostFoundPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('lost_found_posts')
    .delete()
    .eq('id', id);
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
  const { data, error } = await supabase
    .from('recommendation_requests')
    .insert({
      user_id: userId,
      user_name: sanitize(userName, 100),
      service_needed: serviceNeeded,
      description,
      town: input.town,
      tenant_id: getCurrentTenant().id,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRequest(data);
}

export async function resolveRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from('recommendation_requests')
    .update({ status: 'resolved' })
    .eq('id', id);
  if (error) throw error;
}

export async function unresolveRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from('recommendation_requests')
    .update({ status: 'open' })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRequest(id: string): Promise<void> {
  const { error, count } = await supabase
    .from('recommendation_requests')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  if (count === 0) throw new Error('Permission denied: you can only delete your own requests.');
}

export async function deleteResponse(id: string): Promise<void> {
  const { error, count } = await supabase
    .from('recommendation_responses')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  if (count === 0) throw new Error('Permission denied: you can only delete your own responses.');
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
  userName: string
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
    })
    .select()
    .single();
  if (error) throw error;
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

  // Get the accurate count and sync it to the response row
  const { count, error: countError } = await supabase
    .from('recommendation_response_votes')
    .select('*', { count: 'exact', head: true })
    .eq('response_id', responseId);
  if (countError) throw countError;

  const newCount = count ?? 0;
  const { error: updateError } = await supabase
    .from('recommendation_responses')
    .update({ vote_count: newCount })
    .eq('id', responseId);
  if (updateError) throw updateError;

  return newCount;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
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
  if (error) throw error;
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
  if (error) throw new Error('Failed to submit report. Please try again.');
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

export async function submitClaim(
  providerId: string,
  providerName: string,
  verificationMethod: 'email' | 'phone' | 'manual',
  verificationDetail: string
): Promise<void> {
  // Resolve identity from the server-side session — never trust caller-supplied IDs.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to claim a listing.');
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single();
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
    status: 'pending',
    tenant_id: getCurrentTenant().id,
  });
  if (error) throw new Error('Failed to submit claim. Please try again.');
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
  await requireAdmin();
  // Fetch the claim first and derive providerId + userId from the DB record,
  // never from caller-supplied parameters, to prevent cross-object IDOR.
  const { data: claim, error: fetchError } = await supabase
    .from('listing_claims')
    .select('provider_id, user_id, status')
    .eq('id', claimId)
    .single();
  if (fetchError || !claim) throw new Error('Claim not found.');
  if (claim.status !== 'pending') throw new Error('Only pending claims can be approved.');

  const { error: claimError } = await supabase
    .from('listing_claims')
    .update({ status: 'approved' })
    .eq('id', claimId);
  if (claimError) throw new Error('Failed to approve claim.');

  const { error: providerError } = await supabase
    .from('providers')
    .update({ claim_status: 'claimed', claimed_by: claim.user_id })
    .eq('id', claim.provider_id);
  if (providerError) throw new Error('Failed to update provider claim status.');
}

export async function rejectClaim(claimId: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('listing_claims')
    .update({ status: 'rejected' })
    .eq('id', claimId);
  if (error) throw new Error('Failed to reject claim.');
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

  const { error } = await supabase
    .from('providers')
    .update({
      description: input.description ? sanitize(input.description, 2000) : null,
      phone: input.phone ? sanitize(input.phone, 20) : null,
      address: input.address ? sanitize(input.address, 300) : null,
      hours: input.hours ? sanitize(input.hours, 500) : null,
      facebook: input.facebook ? validateUrl(input.facebook) : null,
      website: input.website ? validateUrl(input.website) : null,
      image: input.image || null,
      ...(input.tags !== undefined && { tags: input.tags.map(t => sanitize(t, 50)).slice(0, 20) }),
    })
    .eq('id', id);
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
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
  };
}

export async function fetchReviewReplies(providerId: string): Promise<ReviewReply[]> {
  const { data, error } = await supabase
    .from('review_replies')
    .select('*')
    .eq('provider_id', providerId);
  if (error) throw error;
  return (data ?? []).map(mapReviewReply);
}

export async function submitReviewReply(
  reviewId: string,
  providerId: string,
  ownerId: string,
  ownerName: string,
  replyText: string
): Promise<ReviewReply> {
  const sanitizedReply = sanitize(replyText, 1000);
  if (!sanitizedReply) throw new Error('Reply text is required.');
  const { data, error } = await supabase
    .from('review_replies')
    .insert({
      review_id: reviewId,
      provider_id: providerId,
      owner_id: ownerId,
      owner_name: sanitize(ownerName, 100),
      reply_text: sanitizedReply,
      tenant_id: getCurrentTenant().id,
    })
    .select()
    .single();
  if (error) throw error;
  return mapReviewReply(data);
}

export async function deleteReviewReply(replyId: string): Promise<void> {
  await requireModOrAdmin();
  const { error } = await supabase.from('review_replies').delete().eq('id', replyId);
  if (error) throw new Error('Failed to delete reply.');
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
  if (error) throw new Error('Failed to submit request. Please try again.');
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
  userId: string,
  userName: string,
  title: string,
  description: string,
  eventDate: string,
  location: string,
  town: string,
): Promise<void> {
  const sanitizedTitle = sanitize(title, 200);
  const sanitizedDescription = sanitize(description, 2000);
  const sanitizedLocation = sanitize(location, 300);
  if (!sanitizedTitle) throw new Error('Event title is required.');
  if (!sanitizedDescription) throw new Error('Event description is required.');
  const { error } = await supabase.from('community_events').insert({
    user_id: userId,
    user_name: sanitize(userName, 100),
    title: sanitizedTitle,
    description: sanitizedDescription,
    event_date: eventDate,
    location: sanitizedLocation,
    town,
    tenant_id: getCurrentTenant().id,
  });
  if (error) throw new Error('Failed to submit event. Please try again.');
}

export async function approveCommunityEvent(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('community_events')
    .update({ status: 'approved' })
    .eq('id', id);
  if (error) throw new Error('Failed to approve event.');
}

export async function rejectCommunityEvent(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('community_events')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) throw new Error('Failed to reject event.');
}

// ── Community Alerts ──────────────────────────────────────────────────────────

function mapCommunityAlert(row: any): CommunityAlert {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
  };
}

export async function fetchActiveAlert(): Promise<CommunityAlert | null> {
  const { data, error } = await supabase
    .from('community_alerts')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? mapCommunityAlert(data[0]) : null;
}

export async function createAlert(title: string, description: string, userId: string): Promise<CommunityAlert> {
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
    })
    .select()
    .single();
  if (error) throw new Error('Failed to create alert.');
  return mapCommunityAlert(data);
}

export async function dismissAlert(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from('community_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error('Failed to dismiss alert.');
}

// ── Listing Analytics ─────────────────────────────────────────────────────────

export async function logListingView(providerId: string): Promise<void> {
  const storageKey = `view_${providerId}`;
  if (sessionStorage.getItem(storageKey)) return;
  // Use crypto.randomUUID() instead of Math.random() for proper randomness
  const sessionKey = crypto.randomUUID();
  sessionStorage.setItem(storageKey, sessionKey);
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
