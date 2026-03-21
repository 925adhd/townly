
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Provider, Review, ReviewReply, Town, OwnerUpdate } from '../types';
import {
  fetchMyClaimedListing, updateOwnerListing, uploadOwnerPhoto,
  fetchReviewsByProvider, fetchReviewReplies, submitReviewReply,
  updateReviewReply, deleteOwnReviewReply,
  fetchListingStats, ListingStats,
  fetchFeaturedCount, submitEarlyAccessRequest, checkEarlyAccessRequest,
  fetchOwnerUpdate, upsertOwnerUpdate, deleteOwnerUpdate,
  submitUpdateRequest,
} from '../lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Avatar from '../components/avatar/Avatar';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();
const towns = tenant.towns;

const FEATURED_STRIPE_LINK = '';

// ── Helpers ────────────────────────────────────────────────────────────────────

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
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
function stripFbPrefix(val: string): string {
  return val.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/^(www\.)?facebook\.com\//i, '').replace(/^\//, '');
}
function stripHttps(val: string): string {
  return val.replace(/^https?:\/\//i, '');
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

// ── Main Component ─────────────────────────────────────────────────────────────

interface OwnerPortalProps {
  user: { id: string; name: string; email?: string; role?: string } | null;
}

type Tab = 'overview' | 'edit' | 'updates' | 'reviews' | 'boost';

const OwnerPortal: React.FC<OwnerPortalProps> = ({ user }) => {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Stats
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replies, setReplies] = useState<Record<string, ReviewReply>>({});
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [editReplyLoading, setEditReplyLoading] = useState(false);
  const [deletedReplyReviewIds, setDeletedReplyReviewIds] = useState<Set<string>>(new Set());

  // Edit form
  const [eDesc, setEDesc] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [eOwnerTown, setEOwnerTown] = useState<Town>(towns[0] as Town);
  const [eHoursSchedule, setEHoursSchedule] = useState<DaySchedule[]>(DEFAULT_HOURS_SCHEDULE);
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [serviceEntries, setServiceEntries] = useState<{name: string; day: string; time: string}[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDay, setNewServiceDay] = useState('Sun');
  const [newServiceTime, setNewServiceTime] = useState('10am');
  const [eFacebook, setEFacebook] = useState('');
  const [eWebsite, setEWebsite] = useState('');
  const [eTags, setETags] = useState<string[]>([]);
  const [eChurchLeader, setEChurchLeader] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [addrSuggestions, setAddrSuggestions] = useState<{ display: string; lat: string; lon: string }[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const addrDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Pinned Update
  const [ownerUpdate, setOwnerUpdate] = useState<OwnerUpdate | null>(null);
  const [updateDraft, setUpdateDraft] = useState('');
  const [updateSaving, setUpdateSaving] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Boost
  const [featuredSlots, setFeaturedSlots] = useState<number | null>(null);
  const [earlyAccessSubmitted, setEarlyAccessSubmitted] = useState(false);
  const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);
  const [earlyAccessError, setEarlyAccessError] = useState('');
  const [earlyAccessEmail, setEarlyAccessEmail] = useState('');

  // Removal request
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalMessage, setRemovalMessage] = useState('');
  const [removalSubmitting, setRemovalSubmitting] = useState(false);

  // Load provider
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchMyClaimedListing()
      .then(p => {
        setProvider(p);
        if (p) syncFormState(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Load stats when provider is available
  useEffect(() => {
    if (!provider) return;
    setStatsLoading(true);
    fetchListingStats(provider.id).then(s => setStats(s)).finally(() => setStatsLoading(false));
  }, [provider?.id]);

  // Load reviews when tab is first opened
  useEffect(() => {
    if (activeTab !== 'reviews' || reviewsLoaded || !provider) return;
    Promise.all([fetchReviewsByProvider(provider.id), fetchReviewReplies(provider.id)])
      .then(([revs, repls]) => {
        setReviews(revs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        const map: Record<string, ReviewReply> = {};
        repls.forEach(r => { map[r.reviewId] = r; });
        setReplies(map);
        setReviewsLoaded(true);
      });
  }, [activeTab, reviewsLoaded, provider?.id]);

  // Load pinned update
  useEffect(() => {
    if (!provider) return;
    fetchOwnerUpdate(provider.id).then(u => { setOwnerUpdate(u); setUpdateDraft(u?.content ?? ''); }).catch(() => {});
  }, [provider?.id]);

  // Load boost data
  useEffect(() => {
    if (activeTab !== 'boost' || !provider) return;
    fetchFeaturedCount(provider.category, provider.town).then(count => setFeaturedSlots(count));
    checkEarlyAccessRequest(provider.id).then(exists => { if (exists) setEarlyAccessSubmitted(true); });
  }, [activeTab, provider?.id]);

  function syncFormState(p: Provider) {
    setEDesc(p.description ?? '');
    setEPhone(p.phone ?? '');
    setEAddress(p.address ?? '');
    setEOwnerTown(p.town);
    setEFacebook(stripFbPrefix(p.facebook ?? ''));
    setEWebsite(stripHttps(p.website ?? ''));
    setETags(p.tags ?? []);
    setEChurchLeader(p.churchLeader ?? '');
    setAlwaysOpen(p.hours?.toLowerCase() === 'open 24 hours');
    if (p.category === 'Churches' && p.hours) {
      setServiceEntries(p.hours.split(', ').map(s => {
        const match = s.match(/^(.+?)\s*[-–]\s*(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(.+)$/);
        if (match) return { name: match[1], day: match[2], time: match[3] };
        return { name: s, day: 'Sun', time: '10am' };
      }));
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !user) return;
    setSaving(true);
    setFormError('');
    setFormSuccess('');
    try {
      const isChurch = provider.category === 'Churches';
      const updated = await updateOwnerListing(provider.id, {
        description: eDesc,
        phone: ePhone,
        address: eAddress.trim(),
        hours: isChurch
          ? serviceEntries.map(s => `${s.name} – ${s.day} ${s.time}`).join(', ')
          : alwaysOpen ? 'Open 24 hours' : serializeHoursSchedule(eHoursSchedule),
        facebook: eFacebook ? `https://facebook.com/${eFacebook}` : '',
        website: eWebsite ? `https://${eWebsite}` : '',
        tags: eTags,
        town: eOwnerTown,
        ...(isChurch ? { churchLeader: eChurchLeader } : {}),
      });
      setProvider(updated);
      setFormSuccess('Changes saved.');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !provider || !user) return;
    setUploadingPhoto(true);
    setFormError('');
    try {
      const url = await uploadOwnerPhoto(provider.id, user.id, file);
      const updated = await updateOwnerListing(provider.id, { image: url });
      setProvider(updated);
      setFormSuccess('Photo uploaded.');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim() || !user || !provider) return;
    setSubmittingReply(true);
    try {
      const reply = await submitReviewReply(reviewId, provider.id, user.id, replyText.trim());
      setReplies(prev => ({ ...prev, [reviewId]: reply }));
      setReplyingTo(null);
      setReplyText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEditReply = async (replyId: string, reviewId: string) => {
    if (!editReplyText.trim()) return;
    setEditReplyLoading(true);
    try {
      await updateReviewReply(replyId, editReplyText.trim());
      setReplies(prev => ({ ...prev, [reviewId]: { ...prev[reviewId], replyText: editReplyText.trim() } }));
      setEditingReplyId(null);
      setEditReplyText('');
    } catch (e) { console.error(e); }
    finally { setEditReplyLoading(false); }
  };

  const handleDeleteReply = async (replyId: string, reviewId: string) => {
    try {
      await deleteOwnReviewReply(replyId);
      setReplies(prev => { const next = { ...prev }; delete next[reviewId]; return next; });
      setDeletedReplyReviewIds(prev => new Set(prev).add(reviewId));
    } catch (e) { console.error(e); }
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

  const handleRemovalRequest = async () => {
    if (!provider || !user) return;
    setRemovalSubmitting(true);
    try {
      await submitUpdateRequest(provider.id, user.id, user.name, '[REMOVAL REQUEST] ' + removalMessage);
      setShowRemovalModal(false);
      setRemovalMessage('');
    } catch (e) { console.error(e); }
    finally { setRemovalSubmitting(false); }
  };

  // ── Guards ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <i className="fas fa-circle-notch fa-spin text-2xl text-slate-300"></i>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <i className="fas fa-lock text-4xl text-slate-300"></i>
        <h1 className="text-xl font-bold text-slate-900">Sign in to manage your listing</h1>
        <p className="text-sm text-slate-500">You need to be logged in to access the Owner Dashboard.</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <i className="fas fa-store text-4xl text-slate-300"></i>
        <h1 className="text-xl font-bold text-slate-900">No claimed listing</h1>
        <p className="text-sm text-slate-500">You haven't claimed a listing yet. Find your listing in the directory and claim it to manage it here.</p>
        <Link to="/directory" className="inline-block mt-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
          Browse Directory
        </Link>
      </div>
    );
  }

  const isChurch = provider.category === 'Churches';
  const unrepliedCount = reviews.filter(r => !replies[r.id] && !deletedReplyReviewIds.has(r.id)).length;

  // ── Tabs Config ───────────────────────────────────────────────────────────────

  const tabs: { key: Tab; icon: string; label: string; badge?: number }[] = [
    { key: 'overview', icon: 'fa-chart-line', label: 'Overview' },
    { key: 'edit', icon: 'fa-pen', label: 'Edit Listing' },
    { key: 'updates', icon: 'fa-thumbtack', label: 'Pinned Post' },
    ...(!isChurch ? [{ key: 'reviews' as Tab, icon: 'fa-star', label: 'Reviews', badge: unrepliedCount }] : []),
    { key: 'boost', icon: 'fa-rocket', label: 'Boost' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {provider.image ? (
          <img src={provider.image} className="w-14 h-14 rounded-2xl object-cover border border-slate-200" alt="" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
            <i className="fas fa-store text-xl"></i>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{provider.name}</h1>
          <p className="text-sm text-slate-500">{provider.category} &middot; {provider.town}</p>
        </div>
        <Link to={`/provider/${provider.id}`} className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1.5">
          <i className="fas fa-external-link text-[10px]"></i>
          View Listing
        </Link>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-max min-w-full">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className={`fas ${tab.icon} mr-1.5`}></i>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick stats */}
          {statsLoading ? (
            <div className="text-center py-8"><i className="fas fa-circle-notch fa-spin text-slate-300 text-xl"></i></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'This Week', value: stats.thisWeek, prev: stats.lastWeek },
                  { label: 'Last Week', value: stats.lastWeek },
                  { label: 'This Month', value: stats.thisMonth, prev: stats.lastMonth },
                  { label: 'Last Month', value: stats.lastMonth },
                ].map((s, i) => {
                  const delta = s.prev !== undefined ? s.value - s.prev : undefined;
                  return (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
                      {delta !== undefined && delta !== 0 && (
                        <div className={`text-[10px] font-bold mt-1 ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          <i className={`fas fa-arrow-${delta > 0 ? 'up' : 'down'} mr-0.5`}></i>
                          {Math.abs(delta)} views
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {stats.monthly.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Monthly Views (Last 12 Months)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.monthly}>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : null}

          {/* At-a-glance listing info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Listing Summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <i className="fas fa-phone text-slate-300 text-[11px] mt-1"></i>
                <span className="text-slate-700">{provider.phone || <span className="text-slate-300 italic">Not set</span>}</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fas fa-location-dot text-slate-300 text-[11px] mt-1"></i>
                <span className="text-slate-700">{provider.address || <span className="text-slate-300 italic">Not set</span>}</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fas fa-clock text-slate-300 text-[11px] mt-1"></i>
                <span className="text-slate-700">{provider.hours || <span className="text-slate-300 italic">Not set</span>}</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fas fa-globe text-slate-300 text-[11px] mt-1"></i>
                <span className="text-slate-700">{provider.website ? <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{stripHttps(provider.website)}</a> : <span className="text-slate-300 italic">Not set</span>}</span>
              </div>
            </div>
            {provider.description ? (
              <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{provider.description}</p>
            ) : (
              <p className="text-sm text-slate-300 italic border-t border-slate-100 pt-3">No description yet — add one in the Edit tab.</p>
            )}
            {provider.churchLeader && (
              <p className="text-sm text-slate-500 mt-1">Led by <span className="text-slate-700">{provider.churchLeader}</span></p>
            )}
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('edit')} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
              <i className="fas fa-pen mr-1.5 text-[10px]"></i>Edit Listing
            </button>
            <button onClick={() => setActiveTab('updates')} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
              <i className="fas fa-thumbtack mr-1.5 text-[10px]"></i>Post an Update
            </button>
            {!isChurch && (
              <button onClick={() => setActiveTab('reviews')} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                <i className="fas fa-star mr-1.5 text-[10px]"></i>View Reviews
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Listing Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'edit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Photo upload */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{isChurch ? 'Church Photo' : 'Listing Photo'}</label>
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
                {provider.image && <span className="text-xs text-slate-400">Your photo is live</span>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
              <textarea
                value={eDesc}
                onChange={e => setEDesc(e.target.value)}
                rows={3}
                placeholder={isChurch ? "Describe your church, denomination, and what visitors can expect..." : "Briefly describe what you offer and the services you provide..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {isChurch && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Church Leader</label>
                <input
                  type="text"
                  value={eChurchLeader}
                  onChange={e => setEChurchLeader(e.target.value)}
                  placeholder="e.g. Pastor John Smith"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 ml-1">Include title if applicable (Pastor, Father, etc.)</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={ePhone}
                  onChange={e => setEPhone(formatPhone(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    placeholder="123 Main St, Leitchfield, KY 42754"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                  />
                  {addrLoading && <i className="fas fa-circle-notch fa-spin text-slate-300 text-xs absolute right-3 top-1/2 -translate-y-1/2"></i>}
                </div>
                {addrOpen && addrSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {addrSuggestions.map((s, i) => (
                      <li
                        key={i}
                        onMouseDown={() => { setEAddress(s.display); setAddrSuggestions([]); setAddrOpen(false); }}
                        className="px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 leading-snug"
                      >
                        <i className="fas fa-location-dot text-slate-300 mr-2 text-[10px]"></i>{s.display}
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {towns.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Hours / Service Times */}
            {isChurch ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Service Times</label>
                {provider.hours && (
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <i className="fas fa-clock text-[10px]"></i>
                    Currently saved: <span className="font-medium text-slate-600">{provider.hours}</span>
                  </p>
                )}
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 space-y-2">
                  {serviceEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2">
                      <input
                        type="text"
                        value={entry.name}
                        onChange={e => setServiceEntries(prev => prev.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                        className="text-xs font-semibold text-slate-700 flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-none py-0.5"
                      />
                      <select value={entry.day} onChange={e => setServiceEntries(prev => prev.map((s, idx) => idx === i ? { ...s, day: e.target.value } : s))} className="text-[10px] font-bold text-slate-400 bg-transparent border-none outline-none cursor-pointer">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={entry.time} onChange={e => setServiceEntries(prev => prev.map((s, idx) => idx === i ? { ...s, time: e.target.value } : s))} className="text-[10px] font-bold text-slate-400 bg-transparent border-none outline-none cursor-pointer">
                        {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button type="button" onClick={() => setServiceEntries(prev => prev.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500 text-xs flex-shrink-0"><i className="fas fa-times"></i></button>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2 space-y-2">
                    <input
                      type="text"
                      value={newServiceName}
                      onChange={e => setNewServiceName(e.target.value)}
                      placeholder="e.g. Sunday Morning Worship, Children's Church..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <select value={newServiceDay} onChange={e => setNewServiceDay(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none">
                        {HOUR_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={newServiceTime} onChange={e => setNewServiceTime(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none">
                        {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newServiceName.trim()) return;
                          setServiceEntries(prev => [...prev, { name: newServiceName.trim(), day: newServiceDay, time: newServiceTime }]);
                          setNewServiceName('');
                        }}
                        className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >Add</button>
                    </div>
                  </div>
                  {serviceEntries.length > 0 && (
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                      Preview: <span className="font-medium text-slate-600">{serviceEntries.map(s => `${s.name} – ${s.day} ${s.time}`).join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Hours</label>
                {provider.hours && (
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <i className="fas fa-clock text-[10px]"></i>
                    Currently saved: <span className="font-medium text-slate-600">{provider.hours}</span>
                  </p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="op-always-open"
                    checked={alwaysOpen}
                    onChange={e => setAlwaysOpen(e.target.checked)}
                    className="accent-emerald-600 w-3.5 h-3.5"
                  />
                  <label htmlFor="op-always-open" className="text-xs font-semibold text-slate-700 cursor-pointer">Open 24 hours</label>
                </div>
                {!alwaysOpen && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 space-y-2">
                  {HOUR_DAYS.map((day, i) => {
                    const d = eHoursSchedule[i];
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <input type="checkbox" id={`op-day-${i}`} checked={d.open}
                          onChange={e => setEHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, open: e.target.checked } : s))}
                          className="accent-emerald-600 w-3.5 h-3.5 flex-shrink-0"
                        />
                        <label htmlFor={`op-day-${i}`} className="text-xs font-semibold text-slate-700 w-7 flex-shrink-0 cursor-pointer">{day}</label>
                        {d.open ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <select value={d.openTime} onChange={e => setEHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, openTime: e.target.value } : s))}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none">
                              {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span className="text-xs text-slate-400">–</span>
                            <select value={d.closeTime} onChange={e => setEHoursSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, closeTime: e.target.value } : s))}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none">
                              {HOUR_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        ) : <span className="text-xs text-slate-400">Closed</span>}
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                    Preview: <span className="font-medium text-slate-600">{serializeHoursSchedule(eHoursSchedule) || 'Closed'}</span>
                  </p>
                </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Facebook</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="text-xs text-slate-400 bg-slate-100 border-r border-slate-200 px-3 py-3 flex-shrink-0 select-none">facebook.com/</span>
                  <input type="text" value={eFacebook} onChange={e => setEFacebook(stripFbPrefix(e.target.value))}
                    placeholder={isChurch ? 'yourchurch' : 'yourpage'}
                    className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none min-w-0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Website</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="text-xs text-slate-400 bg-slate-100 border-r border-slate-200 px-3 py-3 flex-shrink-0 select-none">https://</span>
                  <input type="text" value={eWebsite} onChange={e => setEWebsite(stripHttps(e.target.value))}
                    placeholder={isChurch ? 'yourchurch.com' : 'yoursite.com'}
                    className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none min-w-0"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{isChurch ? 'Ministry Tags' : 'Service Tags'}</label>
              <p className="text-xs text-slate-400 mb-2">{isChurch ? 'Add keywords for ministries and programs (e.g. "youth group", "food pantry").' : 'Add keywords for services you offer (e.g. "oil change", "roof repair").'}</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text" value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault();
                      const tag = tagInput.trim().toLowerCase().replace(/,/g, '');
                      if (!eTags.includes(tag)) setETags(prev => [...prev, tag]);
                      setTagInput('');
                    }
                  }}
                  placeholder={isChurch ? 'Type a ministry and press Enter...' : 'Type a service and press Enter...'}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button type="button" onClick={() => {
                  const tag = tagInput.trim().toLowerCase().replace(/,/g, '');
                  if (tag && !eTags.includes(tag)) setETags(prev => [...prev, tag]);
                  setTagInput('');
                }} className="bg-slate-100 text-slate-600 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 text-sm">Add</button>
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

            {formError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{formError}</div>}
            {formSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl"><i className="fas fa-check mr-2"></i>{formSuccess}</div>}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 text-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setShowRemovalModal(true)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Request Removal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Pinned Post Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'updates' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <i className="fas fa-thumbtack text-blue-400 text-[10px]"></i>Pinned Update
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">A short notice shown at the top of your listing — closures, new hours, announcements. Max 280 characters.</p>
          </div>

          {ownerUpdate && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Currently Pinned</p>
              <p className="text-sm text-slate-700 leading-relaxed">{ownerUpdate.content}</p>
              <p className="text-[10px] text-slate-400 mt-1">Updated {new Date(ownerUpdate.updatedAt).toLocaleDateString()}</p>
            </div>
          )}

          <textarea
            value={updateDraft}
            onChange={e => setUpdateDraft(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="e.g. Closed Dec 25. Reopening Dec 26 at 8am."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
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
                      setOwnerUpdate(null);
                      setUpdateDraft('');
                      setUpdateSuccess('Update removed.');
                      setTimeout(() => setUpdateSuccess(''), 3000);
                    } catch { setUpdateError('Failed to remove.'); }
                    finally { setUpdateSaving(false); }
                  }}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-100 hover:border-red-200 transition-colors disabled:opacity-50"
                >Remove</button>
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
                    setOwnerUpdate(fresh);
                    setUpdateSuccess('Update posted!');
                    setTimeout(() => setUpdateSuccess(''), 3000);
                  } catch { setUpdateError('Failed to save update.'); }
                  finally { setUpdateSaving(false); }
                }}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >{updateSaving ? 'Saving...' : ownerUpdate ? 'Update' : 'Post'}</button>
            </div>
          </div>
          {updateSuccess && <p className="text-xs text-emerald-600 font-semibold">{updateSuccess}</p>}
          {updateError && <p className="text-xs text-red-500">{updateError}</p>}
        </div>
      )}

      {/* ── Reviews Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {!reviewsLoaded ? (
            <div className="text-center py-8"><i className="fas fa-circle-notch fa-spin text-slate-300 text-xl"></i></div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <i className="fas fa-star text-3xl text-slate-200 mb-2"></i>
              <p className="text-slate-500 font-semibold">No reviews yet</p>
              <p className="text-xs text-slate-400 mt-1">Reviews from customers will show up here so you can respond.</p>
            </div>
          ) : (
            <>
              {unrepliedCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
                  <i className="fas fa-comment-dots mr-1.5"></i>
                  You have <span className="font-bold">{unrepliedCount}</span> review{unrepliedCount !== 1 ? 's' : ''} waiting for a response.
                </div>
              )}
              {reviews.map(review => (
                <div key={review.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar user={{ id: review.userId, name: review.userName }} size="md" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{review.userName}</div>
                        <div className="text-slate-400 text-[10px] font-medium uppercase">{new Date(review.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded-lg">
                      <span className="text-amber-600 font-bold text-sm">{review.rating}</span>
                      <i className="fas fa-star text-amber-400 text-[10px]"></i>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Service Performed</div>
                    <div className="text-slate-900 font-semibold text-sm">{review.serviceDescription}</div>
                  </div>

                  <p className="text-slate-600 text-sm leading-relaxed mb-4">"{review.reviewText}"</p>

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
                          <i className="fas fa-store mr-1.5 text-[10px]"></i>Your Response
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingReplyId(replies[review.id].id); setEditReplyText(replies[review.id].replyText); }}
                            className="text-slate-300 hover:text-blue-400 text-xs transition-colors" title="Edit reply"
                          ><i className="fas fa-pen"></i></button>
                          <button
                            onClick={() => handleDeleteReply(replies[review.id].id, review.id)}
                            className="text-slate-300 hover:text-red-400 text-xs transition-colors" title="Delete reply"
                          ><i className="fas fa-trash"></i></button>
                        </div>
                      </div>
                      {editingReplyId === replies[review.id].id ? (
                        <div className="space-y-2 mt-1">
                          <textarea value={editReplyText} onChange={e => setEditReplyText(e.target.value)} rows={3}
                            className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingReplyId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                            <button onClick={() => handleEditReply(replies[review.id].id, review.id)} disabled={editReplyLoading || !editReplyText.trim()}
                              className="text-xs font-bold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60">
                              {editReplyLoading ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-600 text-sm leading-relaxed">{replies[review.id].replyText}</p>
                      )}
                      {replies[review.id].resolvedByReviewer === true && (
                        <div className="mt-2 pt-2 border-t border-emerald-100">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700">
                            <i className="fas fa-circle-check mr-1"></i>Reviewer marked as resolved
                          </span>
                        </div>
                      )}
                    </div>
                  ) : !deletedReplyReviewIds.has(review.id) && (
                    replyingTo === review.id ? (
                      <div className="mt-3 ml-4 space-y-2">
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3}
                          placeholder="Write a professional response to this review..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            className="text-xs font-semibold text-slate-500 bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                          <button onClick={() => handleSubmitReply(review.id)} disabled={submittingReply || !replyText.trim()}
                            className="text-xs font-bold text-white bg-emerald-600 px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60">
                            {submittingReply ? 'Posting...' : 'Post Response'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                        className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors">
                        <i className="fas fa-reply text-[10px]"></i>Reply to Review
                      </button>
                    )
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Boost Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'boost' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-2.5 rounded-xl leading-relaxed">
            <i className="fas fa-circle-check mr-1.5 text-emerald-400"></i>
            Your listing is already live and visible for free. Everything below is completely optional.
          </div>

          <div className={`border rounded-2xl p-5 space-y-3 ${provider.listingTier === 'featured' ? 'bg-amber-100 border-amber-400' : featuredSlots !== null && featuredSlots >= 3 ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-300'}`}>
            <div>
              <span className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <i className="fas fa-bolt text-amber-500 text-sm"></i>Top of Category Placement
              </span>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Want your listing to show up first? You can boost it anytime — your listing will appear at the top when locals browse your category.
              </p>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Shown before standard listings in your category</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Gold-highlighted listing that stands out</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Direct call and website buttons</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Priority exposure in the directory</li>
              <li className="flex items-center gap-2 font-semibold text-amber-700">
                <i className="fas fa-lock text-amber-500 text-[10px]"></i>
                {provider.listingTier === 'featured' ? '✓ Your spot is active'
                  : featuredSlots !== null && featuredSlots >= 3 ? 'All 3 spots filled — check back soon'
                  : 'Limited spots available to keep things fair and effective'}
              </li>
              {provider.listingTier !== 'featured' && !(featuredSlots !== null && featuredSlots >= 3) && featuredSlots !== null && (
                <li className="flex flex-col gap-0.5 pl-4" style={{ fontSize: '12px', color: '#92400E' }}>
                  <span>{3 - featuredSlots} spot{3 - featuredSlots !== 1 ? 's' : ''} currently available in your category</span>
                </li>
              )}
            </ul>

            {/* Member Pricing */}
            <div className="mt-4 rounded-xl px-3 py-3 space-y-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <p style={{ fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>Member Pricing</p>
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

            {provider.listingTier !== 'featured' && !(featuredSlots !== null && featuredSlots >= 3) && (
              FEATURED_STRIPE_LINK ? (
                <a href={FEATURED_STRIPE_LINK} target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm">
                  <i className="fas fa-star text-[10px]"></i>Explore Boost Options
                </a>
              ) : earlyAccessSubmitted ? (
                <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-4 py-2.5 rounded-xl text-xs">
                  <i className="fas fa-check-circle"></i>Request submitted — we'll be in touch soon!
                </div>
              ) : (
                <>
                  <input type="email" value={earlyAccessEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEarlyAccessEmail(e.target.value)}
                    placeholder="Your contact email"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  {earlyAccessError && <p className="text-red-500 text-xs text-center">{earlyAccessError}</p>}
                  <button type="button" onClick={handleEarlyAccessRequest} disabled={earlyAccessLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-60">
                    <i className="fas fa-star text-[10px]"></i>
                    {earlyAccessLoading ? 'Submitting...' : 'Explore Boost Options'}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">This is optional and can be used anytime.</p>
                </>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Removal Request Modal ─────────────────────────────────────────────── */}
      {showRemovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Request Listing Removal</h3>
            <p className="text-sm text-slate-500">Tell us why you'd like this listing removed. Our team will review your request.</p>
            <textarea
              value={removalMessage}
              onChange={e => setRemovalMessage(e.target.value)}
              rows={3}
              placeholder="Reason for removal..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRemovalModal(false)} className="text-sm font-semibold text-slate-500 bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleRemovalRequest} disabled={removalSubmitting || !removalMessage.trim()}
                className="text-sm font-bold text-white bg-red-600 px-4 py-2 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
                {removalSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerPortal;
