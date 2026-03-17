
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Provider, Review, ReviewReply, Category, Town, OwnerUpdate } from '../types';
import { updateProvider, deleteProvider, deleteReview, deleteOwnReview, updateOwnerListing, uploadOwnerPhoto, submitUpdateRequest, submitClaim, uploadClaimProof, fetchReviewReplies, submitReviewReply, updateReviewReply, deleteReviewReply, deleteOwnReviewReply, markReplyResolution, fetchFeaturedCount, logListingView, fetchListingStats, ListingStats, submitEarlyAccessRequest, checkEarlyAccessRequest, fetchProviderById, fetchReviewsByProvider, toggleClaimStatus, lookupUserByEmail, fetchOwnerUpdate, upsertOwnerUpdate, deleteOwnerUpdate } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';
import { IconHome, IconCar, IconScissors, IconStethoscope, IconToolsKitchen2, IconBuildingChurch, IconBriefcase, IconKey, IconBuildingStore, IconShoppingBag, IconSchool, IconBuildingBank, IconCalendarEvent, IconTrees } from '@tabler/icons-react';

const tenant = getCurrentTenant();

// When you're ready to accept payments for Featured listings, set this to your Stripe payment link.
// While empty, owners see an "early access" email form instead.
const FEATURED_STRIPE_LINK = '';

interface ProviderDetailProps {
  user: { id: string; name: string; email?: string; role?: string } | null;
}

const HOUR_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const HOUR_TIMES: string[] = [
  '12am','12:30am','1am','1:30am','2am','2:30am','3am','3:30am','4am','4:30am',
  '5am','5:30am','6am','6:30am','7am','7:30am','8am','8:30am','9am','9:30am',
  '10am','10:30am','11am','11:30am','12pm','12:30pm','1pm','1:30pm','2pm','2:30pm',
  '3pm','3:30pm','4pm','4:30pm','5pm','5:30pm','6pm','6:30pm','7pm','7:30pm',
  '8pm','8:30pm','9pm','9:30pm','10pm','10:30pm','11pm','11:30pm',
];
interface DaySchedule { open: boolean; openTime: string; closeTime: string; }
const DEFAULT_HOURS_SCHEDULE: DaySchedule[] = [
  { open: true,  openTime: '9am', closeTime: '5pm' },
  { open: true,  openTime: '9am', closeTime: '5pm' },
  { open: true,  openTime: '9am', closeTime: '5pm' },
  { open: true,  openTime: '9am', closeTime: '5pm' },
  { open: true,  openTime: '9am', closeTime: '5pm' },
  { open: false, openTime: '9am', closeTime: '1pm' },
  { open: false, openTime: '9am', closeTime: '1pm' },
];
function serializeHoursSchedule(schedule: DaySchedule[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < 7) {
    if (!schedule[i].open) { i++; continue; }
    let j = i + 1;
    while (j < 7 && schedule[j].open && schedule[j].openTime === schedule[i].openTime && schedule[j].closeTime === schedule[i].closeTime) j++;
    const label = j - i > 1 ? `${HOUR_DAYS[i]}–${HOUR_DAYS[j - 1]}` : HOUR_DAYS[i];
    parts.push(`${label} ${schedule[i].openTime}–${schedule[i].closeTime}`);
    i = j;
  }
  return parts.join(', ') || 'Closed';
}
const STATE_ABBR: Record<string, string> = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS',
  'Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH',
  'New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC',
  'North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA',
  'Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN',
  'Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
  'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
};
function buildCleanAddress(addr: Record<string, string>): string {
  const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '';
  const state = STATE_ABBR[addr.state] || addr.state || '';
  const zip = addr.postcode || '';
  return [street, city, state && zip ? `${state} ${zip}` : state || zip].filter(Boolean).join(', ');
}

function stripTownFromAddress(address: string, town: string): string {
  return address
    .replace(new RegExp(',?\\s*' + town.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,?\\s*(KY)?\\s*\\d*', 'gi'), '')
    .replace(/,\s*$/, '')
    .trim();
}

function stripFbPrefix(val: string): string {
  return val.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/^(www\.)?facebook\.com\//i, '').replace(/^\//, '');
}
function stripHttps(val: string): string {
  return val.replace(/^https?:\/\//i, '');
}

function formatPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-\(\)\.]/g, '');
  if (!/^\d{0,10}$/.test(cleaned)) return raw;
  const d = cleaned;
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const categories: Category[] = ['Food & Drink', 'Shopping', 'Home Services', 'Automotive', 'Personal Care', 'Health & Medical', 'Professional Services', 'Housing & Rentals', 'Churches', 'Schools & Education', 'Government & Public Services', 'Events & Community', 'Parks & Recreation'];
const towns: Town[] = tenant.towns;

const categoryIcon: Record<string, string> = {
  'Home Services': 'fa-house-chimney',
  'Automotive': 'fa-car',
  'Personal Care': 'fa-scissors',
  'Health & Medical': 'fa-stethoscope',
  'Professional Services': 'fa-briefcase',
  'Housing & Rentals': 'fa-key',
  'Food & Drink': 'fa-utensils',
  'Shopping': 'fa-bag-shopping',
  'Churches': 'fa-church',
  'Schools & Education': 'fa-school',
  'Government & Public Services': 'fa-building-columns',
  'Events & Community': 'fa-calendar',
  'Parks & Recreation': 'fa-tree',
};

const categoryIconColor: Record<string, string> = {
  'Home Services': 'text-blue-300',
  'Automotive': 'text-indigo-300',
  'Personal Care': 'text-pink-300',
  'Health & Medical': 'text-emerald-300',
  'Professional Services': 'text-amber-300',
  'Housing & Rentals': 'text-purple-300',
  'Food & Drink': 'text-red-300',
  'Shopping': 'text-orange-300',
  'Churches': 'text-violet-300',
  'Schools & Education': 'text-cyan-300',
  'Government & Public Services': 'text-slate-300',
  'Events & Community': 'text-rose-300',
  'Parks & Recreation': 'text-green-300',
};

function providerImage(provider: Provider): string | null {
  if (provider.image) return provider.image;
  return null;
}

const dirCategoryIcon: Record<string, React.ElementType> = {
  'Home Services': IconHome,
  'Automotive': IconCar,
  'Personal Care': IconScissors,
  'Health & Medical': IconStethoscope,
  'Food & Drink': IconToolsKitchen2,
  'Churches': IconBuildingChurch,
  'Professional Services': IconBriefcase,
  'Housing & Rentals': IconKey,
  'Shopping': IconShoppingBag,
  'Schools & Education': IconSchool,
  'Government & Public Services': IconBuildingBank,
  'Events & Community': IconCalendarEvent,
  'Parks & Recreation': IconTrees,
  'Other': IconBuildingStore,
};

const dirCategoryIconColor: Record<string, string> = {
  'Home Services': 'text-blue-600',
  'Automotive': 'text-indigo-600',
  'Personal Care': 'text-pink-500',
  'Health & Medical': 'text-emerald-600',
  'Professional Services': 'text-amber-600',
  'Housing & Rentals': 'text-purple-600',
  'Food & Drink': 'text-red-500',
  'Shopping': 'text-orange-500',
  'Churches': 'text-violet-600',
  'Schools & Education': 'text-cyan-600',
  'Government & Public Services': 'text-slate-500',
  'Events & Community': 'text-rose-500',
  'Parks & Recreation': 'text-green-600',
};

function hireAgainLabel(category: string): string {
  if (category === 'Food & Drink') return 'would return';
  if (category === 'Personal Care') return 'would book again';
  if (category === 'Health & Medical') return 'would return';
  return 'would hire again';
}

// ── Claim Modal ────────────────────────────────────────────────────────────────

interface ClaimModalProps {
  provider: Provider;
  user: { id: string; name: string; email?: string };
  onClose: () => void;
  onSubmitted: () => void;
}

const PROOF_TYPES = [
  { value: 'google_facebook', label: 'Screenshot of Google Business Profile or Facebook Page admin panel' },
  { value: 'storefront', label: 'Photo of storefront or signage' },
  { value: 'business_card', label: 'Photo of business card' },
] as const;

type VerifyOption = 'email' | 'phone' | 'upload';

const ClaimModal: React.FC<ClaimModalProps> = ({ provider, user, onClose, onSubmitted }) => {
  const [verifyOption, setVerifyOption] = useState<VerifyOption>('email');
  const [detail, setDetail] = useState('');
  const [proofType, setProofType] = useState<string>('google_facebook');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyOptionChange = (opt: VerifyOption) => {
    setVerifyOption(opt);
    setDetail(opt === 'email' ? (user.email ?? '') : '');
    setProofFile(null);
  };

  const handleSubmit = async () => {
    if (verifyOption !== 'upload' && !detail.trim()) {
      setError('Please provide your verification details.');
      return;
    }
    if (verifyOption === 'upload' && !proofFile) {
      setError('Please select a file to upload.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let proofUrl: string | undefined;
      if (proofFile) {
        proofUrl = await uploadClaimProof(proofFile);
      }
      const dbMethod = verifyOption === 'upload' ? 'manual' : verifyOption;
      const dbDetail = verifyOption === 'upload' ? `Proof upload: ${proofType}` : detail.trim();
      await submitClaim(provider.id, provider.name, dbMethod, dbDetail, proofUrl, proofFile ? proofType : undefined);
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-6">
      <div className="bg-white rounded-3xl shadow-2xl p-5 max-w-sm w-full space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{provider.category === 'Churches' ? 'Claim This Listing' : 'Claim This Business'}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{provider.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-0.5">&times;</button>
        </div>

        <p className="text-slate-600 text-sm font-medium">Verify your connection to this business</p>

        <div className="space-y-2">
          {([
            { value: 'email' as VerifyOption, label: 'Verify with business email' },
            { value: 'phone' as VerifyOption, label: 'Verify with phone' },
            { value: 'upload' as VerifyOption, label: 'Upload proof of ownership' },
          ]).map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${verifyOption === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <input
                type="radio"
                name="verifyOption"
                value={opt.value}
                checked={verifyOption === opt.value}
                onChange={() => handleVerifyOptionChange(opt.value)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>

        {verifyOption !== 'upload' && (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              {verifyOption === 'email' ? 'Business email address' : 'Phone number'}
            </label>
            <input
              type={verifyOption === 'email' ? 'email' : 'tel'}
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder={verifyOption === 'email' ? 'owner@yourbusiness.com' : '(270) 555-0100'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {verifyOption === 'phone' && (
              <p className="mt-1.5 text-xs text-slate-400">We'll give you a quick call to verify you're the owner and confirm your claim.</p>
            )}
          </div>
        )}

        {verifyOption === 'upload' && (
          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload proof of ownership</p>
            <div className="space-y-1.5">
              {PROOF_TYPES.map(opt => (
                <label key={opt.value} className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors text-xs ${proofType === opt.value ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <input
                    type="radio"
                    name="proofType"
                    value={opt.value}
                    checked={proofType === opt.value}
                    onChange={() => setProofType(opt.value)}
                    className="mt-0.5 text-blue-600 flex-shrink-0"
                  />
                  <span className="text-slate-700 font-medium leading-snug">{opt.label}</span>
                </label>
              ))}
            </div>
            <div>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {proofFile && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><i className="fas fa-check-circle"></i> {proofFile.name}</p>}
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} className="bg-slate-100 text-slate-700 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">Claiming is always free. We'll review within 1–2 business days.</p>
      </div>
      </div>
    </div>
  );
};

// ── Update Request Modal ───────────────────────────────────────────────────────

interface UpdateRequestModalProps {
  provider: Provider;
  user: { id: string; name: string } | null;
  onClose: () => void;
  removalOnly?: boolean;
}

const UpdateRequestModal: React.FC<UpdateRequestModalProps> = ({ provider, user, onClose, removalOnly }) => {
  const [requestType, setRequestType] = useState<'update' | 'removal'>(removalOnly ? 'removal' : 'update');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) { setError('Please describe your request.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitUpdateRequest(
        provider.id,
        provider.name,
        requestType,
        message.trim()
      );
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-slate-900">{removalOnly ? 'Request Listing Removal' : 'Request Update or Removal'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        {done ? (
          <div className="text-center py-4 space-y-3">
            <i className="fas fa-circle-check text-emerald-500 text-3xl"></i>
            <p className="text-slate-700 font-semibold">Request received.</p>
            <p className="text-slate-500 text-sm">Our team will review it and follow up if needed.</p>
            <button onClick={onClose} className="mt-2 bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-slate-800">Close</button>
          </div>
        ) : (
          <>
            {!removalOnly && (
              <div className="flex gap-2">
                {(['update', 'removal'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setRequestType(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${requestType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                  >
                    {t === 'update' ? 'Update Info' : 'Request Removal'}
                  </button>
                ))}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {requestType === 'update' ? 'What needs to be updated?' : 'Why are you requesting removal?'}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder={requestType === 'update' ? 'e.g. Phone number changed, business closed, incorrect address...' : 'e.g. Business no longer exists, duplicate listing...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div className="flex gap-3">
              <button onClick={onClose} className="bg-slate-100 text-slate-700 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-colors text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm">
                {submitting ? 'Sending...' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Owner Dashboard ────────────────────────────────────────────────────────────

interface OwnerDashboardProps {
  provider: Provider;
  userId: string;
  onSaved: (updated: Provider) => void;
  onRequestRemoval: () => void;
  onPreview: () => void;
  ownerUpdate: OwnerUpdate | null;
  onUpdateChange: (u: OwnerUpdate | null) => void;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ provider, userId, onSaved, onRequestRemoval, onPreview, ownerUpdate, onUpdateChange }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [featuredSlots, setFeaturedSlots] = useState<number | null>(null);
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
const [earlyAccessSubmitted, setEarlyAccessSubmitted] = useState(false);
  const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);
  const [earlyAccessError, setEarlyAccessError] = useState('');

  const [updateDraft, setUpdateDraft] = useState(ownerUpdate?.content ?? '');
  const [updateSaving, setUpdateSaving] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [earlyAccessEmail, setEarlyAccessEmail] = useState('');

  useEffect(() => {
    setUpdateDraft(ownerUpdate?.content ?? '');
  }, [ownerUpdate]);

  useEffect(() => {
    fetchFeaturedCount(provider.category, provider.town).then(count => setFeaturedSlots(count));
  }, [provider.category, provider.town]);

  useEffect(() => {
    checkEarlyAccessRequest(provider.id).then(exists => {
      if (exists) setEarlyAccessSubmitted(true);
    });
  }, [provider.id]);

  useEffect(() => {
    if (!open || stats) return;
    setStatsLoading(true);
    fetchListingStats(provider.id)
      .then(s => setStats(s))
      .finally(() => setStatsLoading(false));
  }, [open, provider.id]);

  const [eDesc, setEDesc] = useState(provider.description ?? '');
  const [ePhone, setEPhone] = useState(provider.phone ?? '');
  const [eAddress, setEAddress] = useState(provider.address ?? '');
  const [eOwnerTown, setEOwnerTown] = useState<Town>(provider.town);
  const [eHoursSchedule, setEHoursSchedule] = useState<DaySchedule[]>(DEFAULT_HOURS_SCHEDULE);
  const [eFacebook, setEFacebook] = useState(stripFbPrefix(provider.facebook ?? ''));
  const [eWebsite, setEWebsite] = useState(stripHttps(provider.website ?? ''));
  const [eTags, setETags] = useState<string[]>(provider.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [addrSuggestions, setAddrSuggestions] = useState<{ display: string; lat: string; lon: string }[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const addrDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateOwnerListing(provider.id, {
        description: eDesc,
        phone: ePhone,
        address: stripTownFromAddress(eAddress, eOwnerTown),
        hours: serializeHoursSchedule(eHoursSchedule),
        facebook: eFacebook ? `https://facebook.com/${eFacebook}` : '',
        website: eWebsite ? `https://${eWebsite}` : '',
        tags: eTags,
        town: eOwnerTown,
      });
      onSaved(updated);
      setSuccess('Changes saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleEarlyAccessRequest = async () => {
    if (!provider) return;
    if (!earlyAccessEmail.trim()) { setEarlyAccessError('Please enter a contact email.'); return; }
    setEarlyAccessLoading(true);
    setEarlyAccessError('');
    try {
      await submitEarlyAccessRequest(provider.id, provider.name, provider.category, earlyAccessEmail.trim());
      setEarlyAccessSubmitted(true);
    } catch (err: any) {
      setEarlyAccessError(err.message || 'Failed to submit request.');
    } finally {
      setEarlyAccessLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const url = await uploadOwnerPhoto(provider.id, userId, file);
      const updated = await updateOwnerListing(provider.id, { image: url });
      onSaved(updated);
      setSuccess('Photo uploaded.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 space-y-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <i className="fas fa-store text-emerald-600"></i>
          <span className="font-bold text-slate-900 text-sm">Owner Dashboard</span>
          <span className="text-[10px] font-semibold text-emerald-600 px-1.5 py-0.5 bg-emerald-100 rounded-md">Free</span>
        </div>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-slate-400 text-xs`}></i>
      </button>

      {open && (
        <>
        {/* Analytics Panel */}
        <div className="border-t border-emerald-200 pt-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <i className="fas fa-chart-line text-emerald-500"></i> Listing Views
          </p>
          {statsLoading ? (
            <p className="text-xs text-slate-400">Loading...</p>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'This Week', value: stats.thisWeek, prev: stats.lastWeek },
                  { label: 'Last Week', value: stats.lastWeek, prev: null },
                  { label: 'This Month', value: stats.thisMonth, prev: stats.lastMonth },
                  { label: 'Last Month', value: stats.lastMonth, prev: null },
                ].map(({ label, value, prev }) => {
                  const delta = prev !== null ? value - prev : null;
                  return (
                    <div key={label} className="bg-white rounded-2xl border border-emerald-100 px-4 py-3 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-2xl font-bold text-slate-900">{value}</p>
                      {delta !== null && (
                        <p className={`text-[10px] font-semibold mt-0.5 ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {delta > 0 ? `↑ +${delta} vs prev` : delta < 0 ? `↓ ${delta} vs prev` : '— same as prev'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="bg-white rounded-2xl border border-emerald-100 px-4 py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Last 12 Months</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={stats.monthly} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #d1fae5', padding: '4px 10px' }}
                      formatter={(v: number) => [v, 'Views']}
                    />
                    <Line type="monotone" dataKey="views" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : null}
        </div>

        {/* Pinned Update */}
        <div className="pt-4 border-t border-emerald-200 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <i className="fas fa-thumbtack text-blue-400 text-[10px]"></i>Pinned Update
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">A short notice shown at the top of your listing — closures, new hours, announcements. Max 280 characters.</p>
          <textarea
            value={updateDraft}
            onChange={e => setUpdateDraft(e.target.value.slice(0, 280))}
            rows={2}
            placeholder="e.g. Closed Dec 25. Reopening Dec 26 at 8am."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] ${updateDraft.length >= 260 ? 'text-red-400' : 'text-slate-300'}`}>{updateDraft.length}/280</span>
            <div className="flex gap-2">
              {ownerUpdate && (
                <button
                  type="button"
                  disabled={updateSaving}
                  onClick={async () => {
                    setUpdateSaving(true);
                    try {
                      await deleteOwnerUpdate(provider.id);
                      onUpdateChange(null);
                      setUpdateDraft('');
                      setUpdateSuccess('Update removed.');
                      setTimeout(() => setUpdateSuccess(''), 3000);
                    } catch { setUpdateError('Failed to remove.'); }
                    finally { setUpdateSaving(false); }
                  }}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-100 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                disabled={updateSaving || !updateDraft.trim()}
                onClick={async () => {
                  setUpdateSaving(true);
                  setUpdateError('');
                  try {
                    await upsertOwnerUpdate(provider.id, updateDraft);
                    const fresh = await fetchOwnerUpdate(provider.id);
                    onUpdateChange(fresh);
                    setUpdateSuccess('Update posted!');
                    setTimeout(() => setUpdateSuccess(''), 3000);
                  } catch { setUpdateError('Failed to save update.'); }
                  finally { setUpdateSaving(false); }
                }}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {updateSaving ? 'Saving…' : ownerUpdate ? 'Update' : 'Post'}
              </button>
            </div>
          </div>
          {updateSuccess && <p className="text-xs text-emerald-600 font-semibold">{updateSuccess}</p>}
          {updateError && <p className="text-xs text-red-500">{updateError}</p>}
        </div>

        <form onSubmit={handleSave} className="space-y-4 border-t border-emerald-200 pt-4">
          {/* Photo upload */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Business Photo</label>
            <div className="flex items-center gap-3">
              {provider.image
                ? <img src={provider.image} className="w-16 h-16 rounded-xl object-cover border border-slate-200" alt="" />
                : <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300"><i className="fas fa-image text-xl"></i></div>
              }
              <label className="cursor-pointer text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                <i className="fas fa-upload text-[10px]"></i>
                {uploadingPhoto ? 'Uploading...' : provider.image ? 'Replace Photo' : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
              {provider.image && (
                <span className="text-xs text-slate-400">Your photo is live</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
            <textarea
              value={eDesc}
              onChange={e => setEDesc(e.target.value)}
              rows={3}
              placeholder="Briefly describe your business and the services you offer..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
              <input
                type="tel"
                value={ePhone}
                onChange={e => setEPhone(formatPhone(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Address</label>
              <div className="relative">
                <input
                  type="text"
                  value={eAddress}
                  onChange={e => {
                    const val = e.target.value;
                    setEAddress(val);
                    setAddrOpen(false);
                    if (addrDebounce.current) clearTimeout(addrDebounce.current);
                    if (val.length < 4) { setAddrSuggestions([]); return; }
                    addrDebounce.current = setTimeout(async () => {
                      setAddrLoading(true);
                      try {
                        const res = await fetch(
                          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&countrycodes=us&limit=5`,
                          { headers: { 'Accept-Language': 'en', 'User-Agent': 'Townly/1.0' } }
                        );
                        const results = await res.json();
                        setAddrSuggestions(results.map((r: any) => ({ display: buildCleanAddress(r.address), lat: r.lat, lon: r.lon })).filter((s: { display: string }) => s.display));
                        setAddrOpen(true);
                      } catch { /* silent */ } finally {
                        setAddrLoading(false);
                      }
                    }, 380);
                  }}
                  onBlur={() => setTimeout(() => setAddrOpen(false), 150)}
                  onFocus={() => addrSuggestions.length > 0 && setAddrOpen(true)}
                  placeholder="123 Main St"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                />
                {addrLoading && (
                  <i className="fas fa-circle-notch fa-spin text-slate-300 text-xs absolute right-3 top-1/2 -translate-y-1/2"></i>
                )}
              </div>
              {addrOpen && addrSuggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {addrSuggestions.map((s, i) => (
                    <li
                      key={i}
                      onMouseDown={() => {
                        setEAddress(s.display);
                        setAddrSuggestions([]);
                        setAddrOpen(false);
                      }}
                      className="px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 leading-snug"
                    >
                      <i className="fas fa-location-dot text-slate-300 mr-2 text-[10px]"></i>
                      {s.display}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
            <select
              value={eOwnerTown}
              onChange={e => setEOwnerTown(e.target.value as Town)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {towns.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Hours builder */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Hours</label>
            {provider.hours && (
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <i className="fas fa-clock text-[10px]"></i>
                Currently saved: <span className="font-medium text-slate-600">{provider.hours}</span>
              </p>
            )}
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 space-y-2">
              {HOUR_DAYS.map((day, i) => {
                const d = eHoursSchedule[i];
                return (
                  <div key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`day-${i}`}
                      checked={d.open}
                      onChange={e => setEHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, open: e.target.checked } : s))}
                      className="accent-emerald-600 w-3.5 h-3.5 flex-shrink-0"
                    />
                    <label htmlFor={`day-${i}`} className="text-xs font-semibold text-slate-700 w-7 flex-shrink-0 cursor-pointer">{day}</label>
                    {d.open ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={d.openTime}
                          onChange={e => setEHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, openTime: e.target.value } : s))}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                        >
                          {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-xs text-slate-400">–</span>
                        <select
                          value={d.closeTime}
                          onChange={e => setEHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, closeTime: e.target.value } : s))}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                        >
                          {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Closed</span>
                    )}
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                Preview: <span className="font-medium text-slate-600">{serializeHoursSchedule(eHoursSchedule) || 'Closed'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Facebook</label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-xs text-slate-400 bg-slate-50 border-r border-slate-200 px-3 py-3 flex-shrink-0 select-none">facebook.com/</span>
                <input
                  type="text"
                  value={eFacebook}
                  onChange={e => setEFacebook(stripFbPrefix(e.target.value))}
                  placeholder="yourbusiness"
                  className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none min-w-0"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Website</label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-xs text-slate-400 bg-slate-50 border-r border-slate-200 px-3 py-3 flex-shrink-0 select-none">https://</span>
                <input
                  type="text"
                  value={eWebsite}
                  onChange={e => setEWebsite(stripHttps(e.target.value))}
                  placeholder="yourbusiness.com"
                  className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none min-w-0"
                />
              </div>
            </div>
          </div>

          {/* Service Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Service Tags</label>
            <p className="text-xs text-slate-400 mb-2">Add keywords for services you offer so customers can find you (e.g. "oil change", "roof repair").</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault();
                    const tag = tagInput.trim().toLowerCase().replace(/,/g, '');
                    if (!eTags.includes(tag)) setETags(prev => [...prev, tag]);
                    setTagInput('');
                  }
                }}
                placeholder="Type a service and press Enter..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const tag = tagInput.trim().toLowerCase().replace(/,/g, '');
                  if (tag && !eTags.includes(tag)) setETags(prev => [...prev, tag]);
                  setTagInput('');
                }}
                className="bg-slate-100 text-slate-600 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 text-sm"
              >Add</button>
            </div>
            {eTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {eTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {tag}
                    <button type="button" onClick={() => setETags(prev => prev.filter(t => t !== tag))} className="text-blue-400 hover:text-blue-600 leading-none">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl"><i className="fas fa-check mr-2"></i>{success}</div>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 text-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Visibility upgrade */}
          <div className="border-t border-emerald-200 pt-4 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visibility Upgrade</p>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded-xl leading-relaxed">
              <i className="fas fa-flask mr-1.5 text-blue-400"></i>
              <span className="font-semibold">Currently in early access</span> — this feature is being piloted with a small group of businesses before a full launch.
            </div>
            <div className={`border rounded-2xl p-5 space-y-3 ${provider.listingTier === 'featured' ? 'bg-amber-100 border-amber-400' : featuredSlots !== null && featuredSlots >= 3 ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-300'}`}>
              <div>
                <span className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <i className="fas fa-bolt text-amber-500 text-sm"></i>Top of Category Placement
                </span>
                <p className="text-xs font-medium text-amber-600 mt-0.5">Premium monthly placement (subscription)</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Be one of the three businesses shown first when locals browse your category on Townly.
                </p>
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> More visibility than standard listings</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Guaranteed Top 3 placement in your category</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Always visible to local customers</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Gold-highlighted listing that stands out</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Direct call and website buttons</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Priority exposure in the directory</li>
                <li className="flex items-center gap-2 font-semibold text-amber-700">
                  <i className="fas fa-lock text-amber-500 text-[10px]"></i>
                  {provider.listingTier === 'featured' ? (
                    '✓ Your spot is active'
                  ) : featuredSlots !== null && featuredSlots >= 3 ? (
                    'All 3 spots filled — check back soon'
                  ) : (
                    'Only 3 businesses per category can hold this placement'
                  )}
                </li>
                {provider.listingTier !== 'featured' && !(featuredSlots !== null && featuredSlots >= 3) && featuredSlots !== null && (
                  <li className="flex flex-col gap-0.5 pl-4" style={{ fontSize: '12px', color: '#92400E' }}>
                    <span>{3 - featuredSlots} spot{3 - featuredSlots !== 1 ? 's' : ''} currently available in your category</span>
                    <span className="text-amber-700 font-medium">Claiming a spot now reserves it before competitors take it.</span>
                  </li>
                )}
              </ul>

              {/* Member Promotion Discounts */}
              <div className="mt-4 rounded-xl px-3 py-3 space-y-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
                <p style={{ fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>Member Promotion Discounts</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-semibold text-slate-700">Weekly Spotlight</p>
                    <p className="text-[10px] text-slate-400 line-through">$25 regular</p>
                    <p className="text-xs font-bold text-amber-600 flex items-center gap-1"><i className="fas fa-star text-[9px]"></i> Member price: $20</p>
                  </div>
                  <div className="flex-1 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-semibold text-slate-700">Featured Post</p>
                    <p className="text-[10px] text-slate-400 line-through">$5 regular</p>
                    <p className="text-xs font-bold text-amber-600 flex items-center gap-1"><i className="fas fa-star text-[9px]"></i> Member price: $4</p>
                  </div>
                </div>
              </div>

              {/* Directory card preview */}
              <button
                type="button"
                onClick={onPreview}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-600 font-semibold py-1.5 px-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors mt-2"
              >
                <i className="fas fa-eye text-slate-400 text-[10px]"></i>
                See how you'd appear in the directory
              </button>

              {provider.listingTier !== 'featured' && !(featuredSlots !== null && featuredSlots >= 3) && (
                FEATURED_STRIPE_LINK ? (
                  <a
                    href={FEATURED_STRIPE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                  >
                    <i className="fas fa-star text-[10px]"></i>
                    Reserve My Spot
                  </a>
                ) : earlyAccessSubmitted ? (
                  <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-4 py-2.5 rounded-xl text-xs">
                    <i className="fas fa-check-circle"></i>
                    Request submitted — we'll be in touch soon!
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      value={earlyAccessEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEarlyAccessEmail(e.target.value)}
                      placeholder="Your contact email"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {earlyAccessError && <p className="text-red-500 text-xs text-center">{earlyAccessError}</p>}
                    <button
                      type="button"
                      onClick={handleEarlyAccessRequest}
                      disabled={earlyAccessLoading}
                      className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-60"
                    >
                      <i className="fas fa-star text-[10px]"></i>
                      {earlyAccessLoading ? 'Submitting...' : 'Request Placement & Pricing'}
                    </button>
                  </>
                )
              )}
            </div>
          </div>
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onRequestRemoval}
            className="text-xs text-slate-300 hover:text-red-400 transition-colors"
          >
            Request listing removal
          </button>
        </div>
        </form>
        </>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const ProviderDetail: React.FC<ProviderDetailProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerReviews, setProviderReviews] = useState<Review[]>([]);
  const [providerLoading, setProviderLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setProviderLoading(true);
    Promise.all([fetchProviderById(id), fetchReviewsByProvider(id)])
      .then(([p, r]) => {
        setProvider(p);
        setProviderReviews(r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      })
      .catch(console.error)
      .finally(() => setProviderLoading(false));
  }, [id]);

  const navigate = useNavigate();
  const [showFullHours, setShowFullHours] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [ownerWelcomeSeen, setOwnerWelcomeSeen] = useState(() => !!localStorage.getItem(`owner-welcome-${id ?? ''}`));
  const [replies, setReplies] = useState<Record<string, ReviewReply>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [editReplyLoading, setEditReplyLoading] = useState(false);
  const [deletedReplyReviewIds, setDeletedReplyReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    fetchReviewReplies(id).then(data => {
      const map: Record<string, ReviewReply> = {};
      data.forEach(r => { map[r.reviewId] = r; });
      setReplies(map);
    }).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (id) logListingView(id, user?.id).catch(() => {});
  }, [id]);

  const [eName, setEName] = useState('');
  const [eCat, setECat] = useState<Category>('Home Services');
  const [eSub, setESub] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eTown, setETown] = useState<Town>(tenant.towns[0]);
  const [eFacebook, setEFacebook] = useState('');
  const [eWebsite, setEWebsite] = useState('');
  const [eAdminDesc, setEAdminDesc] = useState('');
  const [eAdminTags, setEAdminTags] = useState<string[]>([]);
  const [eAdminTagInput, setEAdminTagInput] = useState('');
  const [eAdminAddress, setEAdminAddress] = useState('');
  const [eAdminHoursSchedule, setEAdminHoursSchedule] = useState<DaySchedule[]>(DEFAULT_HOURS_SCHEDULE);
  const [eAdminTier, setEAdminTier] = useState<'none' | 'standard' | 'featured' | 'spotlight'>('none');
  const [togglingClaim, setTogglingClaim] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [ownerUpdate, setOwnerUpdate] = useState<OwnerUpdate | null>(null);

  useEffect(() => {
    if (!provider?.id) return;
    fetchOwnerUpdate(provider.id).then(u => setOwnerUpdate(u)).catch(() => {});
  }, [provider?.id]);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantError, setGrantError] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);

  if (providerLoading) return <div className="flex items-center justify-center py-20"><div className="text-slate-400 text-sm font-medium">Loading...</div></div>;
  if (!provider) return <div className="text-center py-12">Business not found.</div>;

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';
  const isOwner = (import.meta.env.DEV && user?.role === 'admin') || !!(user && provider.claimedBy === user.id);
  const img = providerImage(provider);
  const icon = categoryIcon[provider.category] || 'fa-store';
  const iconColor = categoryIconColor[provider.category] || 'text-slate-300';

  const handleToggleClaim = async () => {
    setTogglingClaim(true);
    try {
      const next = provider.claimStatus === 'claimed' ? 'unclaimed' : 'claimed';
      await toggleClaimStatus(provider.id, next);
      setProvider(p => p ? { ...p, claimStatus: next, claimedBy: next === 'unclaimed' ? undefined : p.claimedBy } : p);
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingClaim(false);
    }
  };

  const handleOpenGrantModal = () => {
    setGrantEmail('');
    setGrantError('');
    setShowGrantModal(true);
  };

  const handleGrantOwnership = async () => {
    if (!grantEmail.trim()) { setGrantError('Enter an email address.'); return; }
    setGrantLoading(true);
    setGrantError('');
    try {
      const found = await lookupUserByEmail(grantEmail);
      if (!found) {
        setGrantError("No account found with that email. They'll need to sign up first, then you can assign them.");
        setGrantLoading(false);
        return;
      }
      await toggleClaimStatus(provider.id, 'claimed', found.id);
      setProvider(p => p ? { ...p, claimStatus: 'claimed', claimedBy: found.id } : p);
      setShowGrantModal(false);
    } catch (e) {
      setGrantError('Something went wrong. Try again.');
      console.error(e);
    } finally {
      setGrantLoading(false);
    }
  };

  const handleDelete = () => {
    setConfirmModal({
      message: `Delete "${provider.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setDeleting(true);
        setDeleteError('');
        try {
          await deleteProvider(provider.id);
          navigate('/directory');
        } catch (err: any) {
          setDeleteError(err.message || 'Failed to delete business.');
          setDeleting(false);
        }
      },
    });
  };

  const openEdit = () => {
    setEName(provider.name);
    setECat(provider.category);
    setESub(provider.subcategory || '');
    setEPhone(provider.phone || '');
    setETown(provider.town);
    setEFacebook(stripFbPrefix(provider.facebook || ''));
    setEWebsite(stripHttps(provider.website || ''));
    setEAdminDesc(provider.description || '');
    setEAdminTags(provider.tags ?? []);
    setEAdminTagInput('');
    setEAdminAddress(provider.address || '');
    setEAdminHoursSchedule(DEFAULT_HOURS_SCHEDULE);
    setEAdminTier(provider.listingTier);
    setEditError('');
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const updated = await updateProvider(provider.id, {
        name: eName,
        category: eCat,
        subcategory: eSub,
        phone: ePhone,
        town: eTown,
        facebook: eFacebook ? `https://facebook.com/${eFacebook}` : '',
        website: eWebsite ? `https://${eWebsite}` : '',
        description: eAdminDesc,
        tags: eAdminTags,
        address: stripTownFromAddress(eAdminAddress, eTown),
        hours: serializeHoursSchedule(eAdminHoursSchedule),
        listingTier: eAdminTier,
      });
      setProvider(updated);
      setEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim() || !user) return;
    setSubmittingReply(true);
    try {
      const reply = await submitReviewReply(reviewId, provider!.id, user.id, replyText.trim());
      setReplies(prev => ({ ...prev, [reviewId]: reply }));
      setReplyingTo(null);
      setReplyText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string, reviewId: string) => {
    try {
      if (isAdminOrMod) {
        await deleteReviewReply(replyId);
      } else {
        await deleteOwnReviewReply(replyId);
        setDeletedReplyReviewIds(prev => new Set(prev).add(reviewId));
      }
      setReplies(prev => { const next = { ...prev }; delete next[reviewId]; return next; });
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditReply = async (replyId: string, reviewId: string) => {
    if (!editReplyText.trim()) return;
    setEditReplyLoading(true);
    try {
      await updateReviewReply(replyId, editReplyText.trim());
      setReplies(prev => ({ ...prev, [reviewId]: { ...prev[reviewId], replyText: editReplyText.trim() } }));
      setEditingReplyId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setEditReplyLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/directory')}
        className="inline-flex items-center text-slate-500 hover:text-blue-600 font-medium text-sm transition-colors"
      >
        <i className="fas fa-arrow-left mr-2"></i>
        Back to Directory
      </button>

      {/* Admin toolbar — above card */}
      {isAdminOrMod && !editing && (
        <div className="flex gap-2">
          <button onClick={openEdit} className="text-xs font-semibold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
            <i className="fas fa-pen text-[10px]"></i> Edit
          </button>
          <button onClick={handleDelete} disabled={deleting} className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60">
            <i className="fas fa-trash text-[10px]"></i> {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={handleToggleClaim} disabled={togglingClaim} className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60 ${provider.claimStatus === 'claimed' ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>
            <i className={`fas text-[10px] ${provider.claimStatus === 'claimed' ? 'fa-lock-open' : 'fa-circle-check'}`}></i>
            {togglingClaim ? '...' : provider.claimStatus === 'claimed' ? 'Mark Unclaimed' : 'Mark Claimed'}
          </button>
          <button onClick={handleOpenGrantModal} className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
            <i className="fas fa-user-plus text-[10px]"></i> Assign Owner
          </button>
        </div>
      )}

      {/* Header Info */}
      {/* Owner Update banner — top of page */}
      {ownerUpdate && (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <i className="fas fa-thumbtack text-blue-400 text-xs mt-0.5 flex-shrink-0"></i>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wide mb-0.5">Owner Update</p>
            <p className="text-sm text-slate-700 leading-relaxed">{ownerUpdate.content}</p>
            <p className="text-[11px] text-slate-400 mt-1">{new Date(ownerUpdate.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-row gap-4">
          {/* Photo */}
          <div className="w-24 h-24 md:w-28 md:h-28 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
            {img
              ? <img src={img} loading="lazy" className="w-full h-full object-cover" alt="" />
              : <i className={`fas ${icon} text-3xl md:text-4xl ${iconColor}`}></i>
            }
          </div>

          {/* Text block */}
          <div className="flex-grow min-w-0">

            {/* Name — primary anchor */}
            <h1 className="text-xl md:text-3xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              {provider.name}
              {provider.claimStatus === 'claimed' && (
                <i className="fas fa-circle-check text-emerald-500 text-base" title={provider.category === 'Churches' ? 'Verified Listing' : 'Verified Business'}></i>
              )}
            </h1>

            {/* Subcategory + category pill */}
            <p className="text-slate-500 text-sm mt-0.5">
              {provider.subcategory || provider.category}
            </p>
            {provider.subcategory && (
              <div className="mt-1">
                <span className="text-[11px] font-semibold text-blue-600 px-2.5 py-1 bg-blue-50 rounded-full">{provider.category}</span>
              </div>
            )}

            {/* Tier badges */}
            {(provider.listingTier === 'featured' || provider.listingTier === 'spotlight') && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {provider.listingTier === 'featured' && (
                  <span className="text-[10px] font-semibold text-amber-700 px-2 py-0.5 bg-amber-100 rounded-full border border-amber-200">Sponsored</span>
                )}
                {provider.listingTier === 'spotlight' && (
                  <span className="text-[10px] font-bold text-amber-600 px-2 py-0.5 bg-amber-50 rounded-full">
                    <i className="fas fa-star mr-0.5 text-[8px]"></i>Local Spotlight
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {provider.description && (
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">{provider.description}</p>
        )}

        <div className="mt-3 space-y-2">
          {/* Address — clickable to Google Maps */}
          {provider.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <i className="fas fa-location-dot text-slate-400 text-[11px] mt-0.5 flex-shrink-0"></i>
              <span>{provider.address}</span>
            </a>
          )}

          {/* Hours — today only + expand */}
          {provider.hours && (() => {
            const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            const todayName = days[new Date().getDay()];
            const lines = provider.hours.split('\n').filter(Boolean);
            const todayLine = lines.find(l => l.toLowerCase().startsWith(todayName.toLowerCase()));
            const todayHours = todayLine ? todayLine.replace(/^[^:]+:\s*/,'') : null;
            return (
              <div className="text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-clock text-slate-400 text-[11px] flex-shrink-0"></i>
                  {todayHours
                    ? <span><span className="font-semibold text-slate-700">Open Today:</span> {todayHours}</span>
                    : <span className="text-slate-400">Hours available</span>
                  }
                  <button
                    onClick={() => setShowFullHours(h => !h)}
                    className="ml-1 text-blue-500 hover:text-blue-700 underline text-[11px]"
                  >
                    {showFullHours ? 'Hide hours' : 'View full hours'}
                  </button>
                </div>
                {showFullHours && (
                  <div className="mt-1.5 ml-5 whitespace-pre-line text-slate-500 leading-relaxed">{provider.hours}</div>
                )}
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {provider.phone && (
              <a href={`tel:${provider.phone}`} className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-xl font-bold text-xs md:text-sm shadow-md hover:bg-blue-700 transition-colors">
                <i className="fas fa-phone mr-1.5"></i>
                <span className="hidden sm:inline">Call </span>{provider.phone}
              </a>
            )}
            {provider.facebook && (
              <a href={provider.facebook.startsWith('http') ? provider.facebook : `https://${provider.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs md:text-sm hover:bg-slate-200 transition-colors">
                <i className="fab fa-facebook mr-1.5 text-blue-600"></i>
                Facebook
              </a>
            )}
            {provider.website && (
              <a href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs md:text-sm hover:bg-slate-200 transition-colors">
                <i className="fas fa-globe mr-1.5 text-slate-500"></i>
                Website
              </a>
            )}
          </div>

          {/* Tags */}
          {provider.tags && provider.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {provider.tags.map((tag: string) => (
                <span key={tag} className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}


        </div>
      </div>

      {/* Claim CTA — unclaimed listings only */}
      {provider.claimStatus !== 'claimed' && !claimSubmitted && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <p className="font-bold text-slate-900 text-base">{provider.category === 'Churches' ? 'Do you represent this church?' : 'Own this business?'}</p>
          {provider.category === 'Churches' ? (
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">Claim your listing to keep your info up to date and respond to reviews.</p>
          ) : (
            <>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">Claim your listing to manage hours, photos, and contact info. Verified businesses can unlock visibility upgrades like top placement in their category.</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                <li className="flex items-center gap-2"><i className="fas fa-check text-blue-500 text-[11px]"></i>Update hours, photos, and contact info</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-blue-500 text-[11px]"></i>Respond to customer reviews</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-blue-500 text-[11px]"></i>Unlock visibility upgrades like top placement in your category</li>
              </ul>
            </>
          )}
          <div className="mt-4">
            {user ? (
              <button
                onClick={() => setShowClaimModal(true)}
                className="w-full bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-md"
              >
                {provider.category === 'Churches' ? 'Claim This Listing' : 'Claim This Business'}
              </button>
            ) : (
              <>
                <Link to="/login?signup=true" state={{ from: location.pathname }} className="block w-full text-center bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-md">
                  Claim This Business
                </Link>
                <p className="mt-2 text-center text-xs text-slate-400">
                  Already have an account?{' '}
                  <Link to="/login" state={{ from: location.pathname }} className="text-blue-500 hover:text-blue-700 underline">Log in</Link>
                </p>
              </>
            )}
          </div>
          {provider.category !== 'Churches' && (
            <p className="mt-3 text-xs text-slate-400">Free to claim. Visibility upgrades are optional.</p>
          )}
        </div>
      )}

      {claimSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <i className="fas fa-circle-check text-emerald-500"></i>
          <p className="text-emerald-700 text-sm font-semibold">Claim request submitted. Our team will review it and notify you.</p>
        </div>
      )}

      {/* Owner welcome banner — shown once after claim is approved */}
      {isOwner && !ownerWelcomeSeen && (
        <div className="bg-emerald-600 text-white rounded-2xl px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <i className="fas fa-circle-check text-emerald-200 text-lg mt-0.5"></i>
            <div>
              <p className="font-bold text-sm">Your listing is now claimed!</p>
              <p className="text-emerald-100 text-xs mt-0.5">Open the Owner Dashboard below to update your info, add photos, and manage your listing.</p>
            </div>
          </div>
          <button
            onClick={() => { localStorage.setItem(`owner-welcome-${id}`, '1'); setOwnerWelcomeSeen(true); }}
            className="text-emerald-200 hover:text-white text-lg leading-none flex-shrink-0 mt-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Owner Dashboard */}
      {(isOwner || isAdminOrMod) && (
        <OwnerDashboard
          provider={provider}
          userId={user!.id}
          onSaved={updated => setProvider(updated)}
          onRequestRemoval={() => setShowUpdateModal(true)}
          onPreview={() => setShowPreviewModal(true)}
          ownerUpdate={ownerUpdate}
          onUpdateChange={(u: OwnerUpdate | null) => setOwnerUpdate(u)}
        />
      )}

      {/* Admin Edit Form */}
      {editing && (
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Business Info</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Business Name</label>
              <input
                type="text"
                name="business-name"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={eName}
                onChange={e => setEName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Category</label>
                <CustomSelect
                  value={eCat}
                  onChange={(v) => setECat(v as Category)}
                  options={categories.map(c => ({ value: c, label: c }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Town</label>
                <CustomSelect
                  value={eTown}
                  onChange={(v) => setETown(v as Town)}
                  options={towns.map(t => ({ value: t, label: t }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Address</label>
              <input
                type="text"
                placeholder="123 Main St"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={eAdminAddress}
                onChange={e => setEAdminAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Membership</label>
              <select
                value={eAdminTier === 'featured' ? 'featured' : 'none'}
                onChange={e => setEAdminTier(e.target.value as 'none' | 'featured')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="none">Not a Member</option>
                <option value="featured">Member</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Specific Service</label>
              <input
                type="text"
                name="subcategory"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={eSub}
                onChange={e => setESub(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={ePhone}
                onChange={e => setEPhone(formatPhone(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Facebook URL</label>
              <input
                type="text"
                name="facebook"
                placeholder="yourbusiness"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={eFacebook}
                onChange={e => setEFacebook(stripFbPrefix(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Website URL</label>
              <input
                type="text"
                name="website"
                placeholder="yoursite.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={eWebsite}
                onChange={e => setEWebsite(stripHttps(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Hours</label>
              {provider.hours && (
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <i className="fas fa-clock text-[10px]"></i>
                  Currently saved: <span className="font-medium text-slate-600">{provider.hours}</span>
                </p>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 space-y-2">
                {HOUR_DAYS.map((day, i) => {
                  const d = eAdminHoursSchedule[i];
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`admin-day-${i}`}
                        checked={d.open}
                        onChange={e => setEAdminHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, open: e.target.checked } : s))}
                        className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0"
                      />
                      <label htmlFor={`admin-day-${i}`} className="text-xs font-semibold text-slate-700 w-7 flex-shrink-0 cursor-pointer">{day}</label>
                      {d.open ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <select
                            value={d.openTime}
                            onChange={e => setEAdminHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, openTime: e.target.value } : s))}
                            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-xs text-slate-400">–</span>
                          <select
                            value={d.closeTime}
                            onChange={e => setEAdminHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, closeTime: e.target.value } : s))}
                            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Closed</span>
                      )}
                    </div>
                  );
                })}
                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  Preview: <span className="font-medium text-slate-600">{serializeHoursSchedule(eAdminHoursSchedule) || 'Closed'}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Description</label>
              <textarea
                value={eAdminDesc}
                onChange={e => setEAdminDesc(e.target.value)}
                rows={3}
                placeholder="Briefly describe this business..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Service Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={eAdminTagInput}
                  onChange={e => setEAdminTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && eAdminTagInput.trim()) {
                      e.preventDefault();
                      const tag = eAdminTagInput.trim().toLowerCase().replace(/,/g, '');
                      if (!eAdminTags.includes(tag)) setEAdminTags(prev => [...prev, tag]);
                      setEAdminTagInput('');
                    }
                  }}
                  placeholder="Type a tag and press Enter..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const tag = eAdminTagInput.trim().toLowerCase().replace(/,/g, '');
                    if (tag && !eAdminTags.includes(tag)) setEAdminTags(prev => [...prev, tag]);
                    setEAdminTagInput('');
                  }}
                  className="bg-slate-100 text-slate-600 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 text-sm"
                >Add</button>
              </div>
              {eAdminTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {eAdminTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {tag}
                      <button type="button" onClick={() => setEAdminTags(prev => prev.filter(t => t !== tag))} className="text-blue-400 hover:text-blue-600 leading-none">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{editError}</div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="bg-slate-100 text-slate-700 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {deleteError}
        </div>
      )}

      {/* Stats Cards */}
      {provider.category !== 'Churches' && <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          {providerReviews.length > 0 ? (
            <>
              <div className="text-3xl font-bold text-amber-500 mb-1">{provider.averageRating.toFixed(1)}</div>
              <div className="flex justify-center mb-1">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className={`fas fa-star text-[10px] ${i < Math.floor(provider.averageRating) ? 'text-amber-400' : 'text-slate-200'}`}></i>
                ))}
              </div>
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Average Rating</div>
            </>
          ) : (
            <>
              <div className="text-slate-300 text-2xl mb-1"><i className="fas fa-star"></i></div>
              <div className="text-slate-400 text-xs font-semibold">No reviews yet</div>
              <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider mt-1">Average Rating</div>
            </>
          )}
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          {providerReviews.length > 0 ? (
            <>
              <div className="text-3xl font-bold text-blue-600 mb-1">{provider.hireAgainPercent}%</div>
              <div className="text-emerald-600 text-xs font-bold mb-1">
                {provider.category === 'Food & Drink' || provider.category === 'Health & Medical' ? 'Would return' :
                 provider.category === 'Personal Care' ? 'Would book again' :
                 provider.category === 'Housing & Rentals' ? 'Would rent again' :
                 provider.category === 'Automotive' ? 'Would use again' :
                 'Would hire again'}
              </div>
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Customer Trust</div>
            </>
          ) : (
            <>
              <div className="text-slate-300 text-2xl mb-1"><i className="fas fa-thumbs-up"></i></div>
              <div className="text-slate-400 text-xs font-semibold">No reviews yet</div>
              <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider mt-1">Customer Trust</div>
            </>
          )}
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center col-span-2 md:col-span-1">
          <div className="text-3xl font-bold text-slate-900 mb-1">{providerReviews.length}</div>
          <div className="text-slate-500 text-xs font-bold mb-1">Community reviews</div>
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Feedback</div>
        </div>
      </div>}

      {/* Reviews Section */}
      {provider.category !== 'Churches' && <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Local Reviews</h2>
          {!isOwner && (
            <Link
              to={`/review/${provider.id}`}
              className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
            >
              Write a Review
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {providerReviews.map(review => (
            <div key={review.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                    {review.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{review.userName}</div>
                    <div className="text-slate-400 text-[10px] font-medium uppercase">{new Date(review.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded-lg">
                    <span className="text-amber-600 font-bold text-sm">{review.rating}</span>
                    <i className="fas fa-star text-amber-400 text-[10px]"></i>
                  </div>
                  {(isAdminOrMod || (user && review.userId === user.id)) && (
                    <button
                      onClick={() => setConfirmModal({
                        message: 'Delete this review? This cannot be undone.',
                        onConfirm: async () => {
                          setConfirmModal(null);
                          if (isAdminOrMod) {
                            await deleteReview(review.id);
                          } else {
                            await deleteOwnReview(review.id);
                          }
                          setProviderReviews(prev => prev.filter(r => r.id !== review.id));
                        },
                      })}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Service Performed</div>
                <div className="text-slate-900 font-semibold text-sm">{review.serviceDescription}</div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                "{review.reviewText}"
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className={`text-xs font-bold px-2 py-1 rounded-lg ${review.wouldHireAgain ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                   {review.wouldHireAgain ? 'Would Hire Again' : 'Would Not Hire Again'}
                </div>
                {review.costRange !== 'not_shared' && (
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Est. Cost: {review.costRange.replace('_', ' ')}
                  </div>
                )}
              </div>

              {/* Owner reply */}
              {replies[review.id] ? (
                <div className="mt-3 ml-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-700">
                      <i className="fas fa-store mr-1.5 text-[10px]"></i>Owner Response
                    </span>
                    {isOwner && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingReplyId(replies[review.id].id); setEditReplyText(replies[review.id].replyText); }}
                          className="text-slate-300 hover:text-blue-400 text-xs transition-colors"
                          title="Edit reply"
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <button
                          onClick={() => setConfirmModal({
                            message: 'Delete your response? You won\'t be able to reply to this review again.',
                            onConfirm: async () => { setConfirmModal(null); await handleDeleteReply(replies[review.id].id, review.id); },
                          })}
                          className="text-slate-300 hover:text-red-400 text-xs transition-colors"
                          title="Delete reply"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    )}
                    {isAdminOrMod && !isOwner && (
                      <button
                        onClick={() => handleDeleteReply(replies[review.id].id, review.id)}
                        className="text-slate-300 hover:text-red-400 text-xs transition-colors"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                  {editingReplyId === replies[review.id].id ? (
                    <div className="space-y-2 mt-1">
                      <textarea
                        value={editReplyText}
                        onChange={e => setEditReplyText(e.target.value)}
                        rows={3}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingReplyId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                        <button
                          onClick={() => handleEditReply(replies[review.id].id, review.id)}
                          disabled={editReplyLoading || !editReplyText.trim()}
                          className="text-xs font-bold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                        >
                          {editReplyLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-sm leading-relaxed">{replies[review.id].replyText}</p>
                  )}
                  {user && review.userId === user.id && review.rating <= 3 && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-100">
                      <button
                        onClick={async () => {
                          const next = replies[review.id].resolvedByReviewer === true ? null : true;
                          await markReplyResolution(replies[review.id].id, next);
                          setReplies((prev: Record<string, ReviewReply>) => ({ ...prev, [review.id]: { ...prev[review.id], resolvedByReviewer: next } }));
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${replies[review.id].resolvedByReviewer === true ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        <i className="fas fa-circle-check mr-1"></i>
                        {replies[review.id].resolvedByReviewer === true ? 'Marked as resolved' : 'Mark as resolved'}
                      </button>
                    </div>
                  )}
                  {replies[review.id].resolvedByReviewer === true && review.rating <= 3 && !(user && review.userId === user.id) && (
                    <div className="mt-2 pt-2 border-t border-emerald-100">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700">
                        <i className="fas fa-circle-check mr-1"></i>Reviewer marked as resolved
                      </span>
                    </div>
                  )}
                </div>
              ) : isOwner && !deletedReplyReviewIds.has(review.id) && (
                replyingTo === review.id ? (
                  <div className="mt-3 ml-4 space-y-2">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="Write a professional response to this review..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="text-xs font-semibold text-slate-500 bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitReply(review.id)}
                        disabled={submittingReply || !replyText.trim()}
                        className="text-xs font-bold text-white bg-emerald-600 px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      >
                        {submittingReply ? 'Posting...' : 'Post Response'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                    className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
                  >
                    <i className="fas fa-reply text-[10px]"></i>
                    Reply as Owner
                  </button>
                )
              )}
            </div>
          ))}
          {providerReviews.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
               <p className="text-slate-500 italic">No reviews yet. Be the first to leave one!</p>
            </div>
          )}
        </div>
      </div>}

      {/* Transparency note — hidden for owners (removal link is inside Owner Dashboard) */}
      {!isOwner && (
        <div className="py-2 border-t border-slate-100">
          <p className="text-slate-400 text-xs">
            Business information sourced from publicly available data. Claim this listing to manage your info, reply to reviews, or request removal.
          </p>
        </div>
      )}

      {/* Listing preview modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">How Your Listing Appears</p>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                <i className="fas fa-xmark"></i>
              </button>
            </div>
            <div className="px-5 pb-3">
              <p className="text-xs text-slate-400">This is what customers see when browsing the directory.</p>
            </div>
            {/* Exact directory card — forced to featured tier */}
            <div className="mx-5 mb-5 select-none pointer-events-none">
              {/* Main card row */}
              <div className="p-4 border shadow-sm flex flex-row items-center gap-4 rounded-t-2xl bg-amber-50 border-amber-300 border-l-4">
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                  {img
                    ? <img src={img} alt={provider.name} className="w-full h-full object-cover" />
                    : (() => { const Icon = dirCategoryIcon[provider.category] ?? IconBuildingStore; return <Icon className={`w-7 h-7 ${dirCategoryIconColor[provider.category] ?? 'text-slate-500'}`} stroke={1.5} />; })()
                  }
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col gap-1.5 mb-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-xs font-semibold text-blue-600 px-2 py-0.5 bg-blue-50 rounded-lg">{provider.category}</span>
                      <span className="text-[10px] font-semibold text-amber-700 px-1.5 py-0.5 bg-amber-100 rounded-md border border-amber-200">Sponsored</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{provider.town}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                    {provider.name}
                    {provider.claimStatus === 'claimed' && (
                      <i className="fas fa-circle-check text-emerald-500 text-sm flex-shrink-0" title="Verified Business"></i>
                    )}
                  </h3>
                  <div className="flex items-center flex-wrap gap-2 text-sm mt-2">
                    {provider.category === 'Churches' ? null : provider.reviewCount > 0 ? (
                      <>
                        <div className="flex items-center text-amber-500 font-bold">
                          <i className="fas fa-star mr-1 text-xs"></i>
                          {provider.averageRating.toFixed(1)}
                        </div>
                        <div className="text-slate-400">({provider.reviewCount} reviews)</div>
                        <div className="flex items-center text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg text-xs">
                          <i className="fas fa-thumbs-up mr-1 text-[10px]"></i>
                          {provider.hireAgainPercent}% {hireAgainLabel(provider.category)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No reviews yet</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between self-stretch py-0.5 flex-shrink-0">
                  <div></div>
                  <i className="fas fa-chevron-right text-slate-300 pr-2"></i>
                </div>
              </div>
              {/* Contact bar — always shown in preview */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-t-0 border-amber-300 border-l-4 rounded-b-2xl flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-lg">
                  <i className="fas fa-phone text-[10px]"></i>{provider.phone || '(000) 000-0000'}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-lg">
                  <i className="fas fa-globe text-[10px]"></i>{provider.website ? 'Visit Website' : 'yourwebsite.com'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant ownership modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <div>
              <p className="text-slate-900 font-bold text-base">Assign Business Owner</p>
              <p className="text-slate-500 text-sm mt-1">Enter the owner's email. They must already have a Townly account, or sign up with this email after you assign them.</p>
            </div>
            <input
              type="email"
              value={grantEmail}
              onChange={e => { setGrantEmail(e.target.value); setGrantError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleGrantOwnership()}
              placeholder="owner@email.com"
              autoComplete="off"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {grantError && <p className="text-red-500 text-xs">{grantError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleGrantOwnership}
                disabled={grantLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                {grantLoading ? 'Assigning...' : 'Assign Owner'}
              </button>
              <button
                onClick={() => setShowGrantModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showClaimModal && (
        <ClaimModal
          provider={provider}
          user={user!}
          onClose={() => setShowClaimModal(false)}
          onSubmitted={() => setClaimSubmitted(true)}
        />
      )}

      {showUpdateModal && (
        <UpdateRequestModal
          provider={provider}
          user={user}
          onClose={() => setShowUpdateModal(false)}
          removalOnly={!!(isOwner && provider.claimStatus === 'claimed')}
        />
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <p className="text-slate-900 font-semibold text-base">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDetail;
