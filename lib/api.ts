import { supabase } from './supabase';
import { Provider, Review, LostFoundPost, RecommendationRequest, RecommendationResponse, ContentReport, ReportContentType, Category, Town, CostRange, LostFoundType, ListingClaim } from '../types';
import { getCurrentTenant } from '../tenants';

// ── helpers ──────────────────────────────────────────────────────────────────

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
    listingTier: (row.listing_tier ?? 'none') as 'none' | 'standard' | 'spotlight',
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
  const { error } = await supabase
    .from('providers')
    .update({ status: 'approved' })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectProvider(id: string): Promise<void> {
  const { error } = await supabase
    .from('providers')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProvider(id: string): Promise<void> {
  const { error } = await supabase
    .from('providers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateProvider(
  id: string,
  input: { name: string; category: Category; subcategory?: string; phone?: string; town: Town; facebook?: string; website?: string }
): Promise<Provider> {
  const { error } = await supabase
    .from('providers')
    .update({
      name: input.name,
      category: input.category,
      subcategory: input.subcategory || null,
      phone: input.phone || null,
      town: input.town,
      facebook: input.facebook || null,
      website: input.website || null,
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
  const { data, error } = await supabase
    .from('providers')
    .insert({
      name: input.name,
      category: input.category,
      subcategory: input.subcategory || null,
      phone: input.phone || null,
      town: input.town,
      created_by: userId,
      status: 'approved',
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
    .order('created_at', { ascending: false });
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
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      provider_id: input.providerId,
      user_id: userId,
      user_name: userName,
      rating: input.rating,
      would_hire_again: input.wouldHireAgain,
      service_description: input.serviceDescription,
      cost_range: input.costRange,
      review_text: input.reviewText,
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
    .order('created_at', { ascending: false });
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
  let photoUrl: string | null = null;

  if (photoFile) {
    const ext = photoFile.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('lost-found-photos')
      .upload(path, photoFile, { upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('lost-found-photos')
      .getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from('lost_found_posts')
    .insert({
      user_id: userId,
      user_name: userName,
      type: input.type,
      title: input.title,
      description: input.description,
      photo_url: photoUrl,
      location_description: input.locationDescription,
      town: input.town,
      date_occurred: input.dateOccurred,
      contact_method: input.contactMethod,
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
      title: input.title,
      description: input.description,
      location_description: input.locationDescription,
      town: input.town,
      date_occurred: input.dateOccurred,
      contact_method: input.contactMethod,
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
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRequest);
}

export async function addRequest(
  input: { serviceNeeded: string; description: string; town: Town },
  userId: string,
  userName: string
): Promise<RecommendationRequest> {
  const { data, error } = await supabase
    .from('recommendation_requests')
    .insert({
      user_id: userId,
      user_name: userName,
      service_needed: input.serviceNeeded,
      description: input.description,
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
  const { data, error } = await supabase
    .from('recommendation_responses')
    .insert({ request_id: requestId, user_id: userId, user_name: userName, recommendation, tenant_id: getCurrentTenant().id })
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
    options: { data: { name } },
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
// Requires a `content_reports` table in Supabase:
//   id uuid default gen_random_uuid() primary key,
//   content_type text not null,
//   content_id text not null,
//   content_title text,
//   reported_by uuid,
//   reported_by_name text,
//   reason text,
//   created_at timestamptz default now()

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
  reportedBy: string,
  reportedByName: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.from('content_reports').insert({
    content_type: contentType,
    content_id: contentId,
    content_title: contentTitle,
    reported_by: reportedBy,
    reported_by_name: reportedByName,
    reason,
    tenant_id: getCurrentTenant().id,
  });
  if (error) throw error;
}

export async function fetchReports(): Promise<ContentReport[]> {
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReport);
}

export async function dismissReport(id: string): Promise<void> {
  const { error } = await supabase.from('content_reports').delete().eq('id', id);
  if (error) throw error;
}

export async function removeContent(contentType: ReportContentType, contentId: string): Promise<void> {
  const tableMap: Record<ReportContentType, string> = {
    provider: 'providers',
    lost_found: 'lost_found_posts',
    recommendation_request: 'recommendation_requests',
    recommendation_response: 'recommendation_responses',
  };
  const { error } = await supabase.from(tableMap[contentType]).delete().eq('id', contentId);
  if (error) throw error;
}

// ── Listing Claims ─────────────────────────────────────────────────────────────

export async function submitClaim(
  providerId: string,
  providerName: string,
  userId: string,
  userName: string,
  userEmail: string,
  verificationMethod: 'email' | 'phone' | 'manual',
  verificationDetail: string
): Promise<void> {
  const { error } = await supabase.from('listing_claims').insert({
    provider_id: providerId,
    provider_name: providerName,
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    verification_method: verificationMethod,
    verification_detail: verificationDetail,
    status: 'pending',
    tenant_id: getCurrentTenant().id,
  });
  if (error) throw error;
}

export async function fetchPendingClaims(): Promise<ListingClaim[]> {
  const { data, error } = await supabase
    .from('listing_claims')
    .select('*')
    .eq('tenant_id', getCurrentTenant().id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapClaim);
}

export async function approveClaim(claimId: string, providerId: string, userId: string): Promise<void> {
  const { error: claimError } = await supabase
    .from('listing_claims')
    .update({ status: 'approved' })
    .eq('id', claimId);
  if (claimError) throw claimError;

  const { error: providerError } = await supabase
    .from('providers')
    .update({ claim_status: 'claimed', claimed_by: userId })
    .eq('id', providerId);
  if (providerError) throw providerError;
}

export async function rejectClaim(claimId: string): Promise<void> {
  const { error } = await supabase
    .from('listing_claims')
    .update({ status: 'rejected' })
    .eq('id', claimId);
  if (error) throw error;
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
  }
): Promise<Provider> {
  const { error } = await supabase
    .from('providers')
    .update({
      description: input.description ?? null,
      phone: input.phone || null,
      address: input.address || null,
      hours: input.hours || null,
      facebook: input.facebook || null,
      website: input.website || null,
      image: input.image || null,
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
  const ext = file.name.split('.').pop();
  const path = `${userId}/${providerId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('provider-photos')
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('provider-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ── Update / Removal Request ───────────────────────────────────────────────────

export async function submitUpdateRequest(
  providerId: string,
  providerName: string,
  requestType: 'update' | 'removal',
  message: string,
  requesterName: string,
  requesterId: string
): Promise<void> {
  const { error } = await supabase.from('content_reports').insert({
    content_type: 'provider',
    content_id: providerId,
    content_title: providerName,
    reported_by: requesterId,
    reported_by_name: requesterName,
    reason: `[${requestType.toUpperCase()} REQUEST] ${message}`,
    tenant_id: getCurrentTenant().id,
  });
  if (error) throw error;
}
