
export type Category = 'Home Services' | 'Automotive' | 'Personal Care' | 'Professional Services' | 'Health & Medical' | 'Housing & Rentals' | 'Food & Drink' | 'Shopping' | 'Churches' | 'Schools & Education' | 'Government & Public Services' | 'Events & Community' | 'Parks & Recreation' | 'Other';

// Town is a plain string so each tenant can define its own town list.
export type Town = string;

export type CostRange = 'under_100' | '100_500' | '500_1000' | '1000_5000' | 'over_5000' | 'not_shared';

export interface Provider {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  description?: string;
  phone?: string;
  website?: string;
  facebook?: string;
  address?: string;
  hours?: string;
  town: Town;
  averageRating: number;
  reviewCount: number;
  hireAgainPercent: number;
  createdAt: string;
  image?: string;
  status: 'pending' | 'approved' | 'rejected';
  claimStatus: 'unclaimed' | 'claimed';
  claimedBy?: string;
  listingTier: 'none' | 'standard' | 'featured' | 'spotlight';
  tags?: string[];
}

export interface ListingClaim {
  id: string;
  providerId: string;
  providerName: string;
  userId: string;
  userName: string;
  userEmail: string;
  verificationMethod: 'email' | 'phone' | 'manual';
  verificationDetail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Review {
  id: string;
  providerId: string;
  userId: string;
  userName: string;
  rating: number;
  wouldHireAgain: boolean;
  serviceDescription: string;
  costRange: CostRange;
  reviewText: string;
  serviceDate: string;
  createdAt: string;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  providerId: string;
  ownerId: string;
  ownerName: string;
  replyText: string;
  createdAt: string;
}

export type LostFoundType = 'lost_pet' | 'found_pet' | 'lost_item' | 'found_item' | 'lost_package' | 'found_package';

export interface LostFoundPost {
  id: string;
  userId: string;
  userName: string;
  type: LostFoundType;
  title: string;
  description: string;
  photoUrl?: string;
  locationDescription: string;
  town: Town;
  dateOccurred: string;
  contactMethod: string;
  status: 'active' | 'resolved';
  createdAt: string;
}

export interface RecommendationRequest {
  id: string;
  userId: string;
  userName: string;
  serviceNeeded: string;
  description: string;
  town: Town;
  status: 'open' | 'resolved';
  createdAt: string;
  responseCount: number;
}

export interface RecommendationResponse {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  recommendation: string;
  voteCount: number;
  createdAt: string;
}

export interface CommunityEvent {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  town: Town;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CommunityAlert {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface SpotlightBooking {
  id: string;
  tenantId: string;
  type: 'spotlight' | 'featured';
  title: string;
  description: string;
  eventDate?: string;
  location?: string;
  town?: string;
  imageUrl?: string;      // banner (16:9, Events page card)
  thumbnailUrl?: string;  // square (1:1, Home page preview)
  flyerUrl?: string;      // portrait (3:4, clickable full flyer)
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  submittedBy?: string;
  submittedByName?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  paymentStatus: 'unpaid' | 'paid';
  stripeSessionId?: string;
  weekStart: string; // ISO date string for the Sunday of the booked week
  adminNotes?: string;
  createdAt: string;
}

export type ReportContentType = 'provider' | 'lost_found' | 'recommendation_request' | 'recommendation_response';

export interface ContentReport {
  id: string;
  contentType: ReportContentType;
  contentId: string;
  contentTitle: string;
  reportedBy: string;
  reportedByName: string;
  reason: string;
  createdAt: string;
}
