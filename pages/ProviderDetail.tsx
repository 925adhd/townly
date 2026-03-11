
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Provider, Review, ReviewReply, Category, Town } from '../types';
import { updateProvider, deleteProvider, deleteReview, updateOwnerListing, uploadOwnerPhoto, submitUpdateRequest, submitClaim, fetchReviewReplies, submitReviewReply, deleteReviewReply, fetchFeaturedCount, logListingView, fetchListingStats, ListingStats } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

// TODO: Replace with your Stripe payment link when ready
const FEATURED_STRIPE_LINK = '';

interface ProviderDetailProps {
  providers: Provider[];
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  user: { id: string; name: string; email?: string; role?: string } | null;
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

// ── Claim Modal ────────────────────────────────────────────────────────────────

interface ClaimModalProps {
  provider: Provider;
  user: { id: string; name: string; email?: string };
  onClose: () => void;
  onSubmitted: () => void;
}

const ClaimModal: React.FC<ClaimModalProps> = ({ provider, user, onClose, onSubmitted }) => {
  const [method, setMethod] = useState<'email' | 'phone' | 'manual'>('email');
  const [detail, setDetail] = useState(user.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!detail.trim()) { setError('Please provide your verification details.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitClaim(
        provider.id,
        provider.name,
        method,
        detail.trim()
      );
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{provider.category === 'Churches' ? 'Claim This Listing' : 'Claim This Business'}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{provider.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-0.5">&times;</button>
        </div>

        <p className="text-slate-600 text-sm">How can we verify you own or manage this business?</p>

        <div className="space-y-2">
          {([
            { value: 'email', label: 'I manage the business email' },
            { value: 'phone', label: 'I can be reached by phone' },
            { value: 'manual', label: "Other — I'll explain below" },
          ] as const).map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${method === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <input
                type="radio"
                name="method"
                value={opt.value}
                checked={method === opt.value}
                onChange={() => {
                  setMethod(opt.value);
                  setDetail(opt.value === 'email' ? (user.email ?? '') : '');
                }}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            {method === 'email' ? 'Business email address' : method === 'phone' ? 'Phone number' : 'Details'}
          </label>
          {method === 'manual' ? (
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              rows={3}
              placeholder="Describe how you can verify ownership..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          ) : (
            <input
              type={method === 'email' ? 'email' : 'tel'}
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder={method === 'email' ? 'owner@yourbusiness.com' : '(270) 555-0100'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          )}
        </div>

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
  );
};

// ── Update Request Modal ───────────────────────────────────────────────────────

interface UpdateRequestModalProps {
  provider: Provider;
  user: { id: string; name: string } | null;
  onClose: () => void;
}

const UpdateRequestModal: React.FC<UpdateRequestModalProps> = ({ provider, user, onClose }) => {
  const [requestType, setRequestType] = useState<'update' | 'removal'>('update');
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
          <h2 className="text-lg font-bold text-slate-900">Request Update or Removal</h2>
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
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ provider, userId, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [featuredSlots, setFeaturedSlots] = useState<number | null>(null);
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showFeaturedPreview, setShowFeaturedPreview] = useState(false);

  useEffect(() => {
    fetchFeaturedCount(provider.category, provider.town).then(count => setFeaturedSlots(count));
  }, [provider.category, provider.town]);

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
  const [eHours, setEHours] = useState(provider.hours ?? '');
  const [eFacebook, setEFacebook] = useState(provider.facebook ?? '');
  const [eWebsite, setEWebsite] = useState(provider.website ?? '');
  const [eTags, setETags] = useState<string[]>(provider.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateOwnerListing(provider.id, {
        description: eDesc,
        phone: ePhone,
        address: eAddress,
        hours: eHours,
        facebook: eFacebook,
        website: eWebsite,
        tags: eTags,
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
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Address</label>
              <input
                type="text"
                value={eAddress}
                onChange={e => setEAddress(e.target.value)}
                placeholder="123 Main St, Leitchfield"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hours</label>
            <input
              type="text"
              value={eHours}
              onChange={e => setEHours(e.target.value)}
              placeholder="Mon–Fri 8am–5pm, Sat 9am–2pm"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Facebook URL</label>
              <input
                type="text"
                value={eFacebook}
                onChange={e => setEFacebook(e.target.value)}
                placeholder="facebook.com/yourbusiness"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Website URL</label>
              <input
                type="text"
                value={eWebsite}
                onChange={e => setEWebsite(e.target.value)}
                placeholder="yoursite.com"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
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
            <div className={`border rounded-2xl p-5 space-y-3 ${provider.listingTier === 'featured' ? 'bg-amber-100 border-amber-400' : featuredSlots !== null && featuredSlots >= 3 ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-300'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                    <i className="fas fa-bolt text-amber-500 text-sm"></i>Category Leader
                  </span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Be one of the three featured businesses at the top of your category in the Townly directory.<br />
                    When locals search for services, your business appears first.
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-xl font-bold text-amber-700">$99</span>
                  <span className="text-xs font-medium text-amber-500">/mo</span>
                </div>
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Locked Top 3 placement in your category</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Always visible to local customers</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Amber-gold highlighted card — visually stands out from standard listings</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Direct call &amp; website buttons shown inline in the directory</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-[10px]"></i> Priority exposure in the directory</li>
                <li className="flex items-center gap-2 font-semibold text-amber-700"><i className="fas fa-lock text-amber-500 text-[10px]"></i>
                  {provider.listingTier === 'featured' ? (
                    '✓ Your spot is active'
                  ) : featuredSlots !== null && featuredSlots >= 3 ? (
                    'All 3 spots filled — check back soon'
                  ) : (
                    `${featuredSlots !== null ? 3 - featuredSlots : '?'} of 3 spots available in ${provider.category}`
                  )}
                </li>
              </ul>

              {/* Preview toggle */}
              <button
                type="button"
                onClick={() => setShowFeaturedPreview((p: boolean) => !p)}
                className="w-full flex items-center justify-between text-xs text-amber-700 font-semibold py-1.5 px-3 bg-amber-100/60 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-eye text-[10px]"></i>
                  {showFeaturedPreview ? 'Hide preview' : 'See how you\u2019d appear in the directory'}
                </span>
                <i className={`fas fa-chevron-${showFeaturedPreview ? 'up' : 'down'} text-[10px]`}></i>
              </button>

              {/* Directory card mock */}
              {showFeaturedPreview && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold px-0.5">Directory preview</p>
                  {/* Card row */}
                  <div className="p-4 border bg-amber-50 border-amber-300 border-l-4 rounded-t-2xl flex flex-row items-center gap-4 shadow-sm pointer-events-none select-none">
                    <div className="w-16 h-16 bg-slate-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                      {provider.image
                        ? <img src={provider.image} alt={provider.name} className="w-full h-full object-cover" />
                        : <i className={`fas ${categoryIcon[provider.category] ?? 'fa-store'} text-2xl ${categoryIconColor[provider.category] ?? 'text-slate-300'}`}></i>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 mb-0.5">
                        <span className="font-bold text-slate-900 text-sm truncate">{provider.name}</span>
                        <span className="text-[10px] font-semibold text-amber-700 px-1.5 py-0.5 bg-amber-100 rounded-md border border-amber-200 flex-shrink-0">Sponsored</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{provider.category}{provider.town ? ` · ${provider.town}` : ''}</p>
                      {provider.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{provider.description}</p>
                      )}
                    </div>
                    <i className="fas fa-chevron-right text-slate-300 pr-2"></i>
                  </div>
                  {/* Contact bar (shown when phone or website is set) */}
                  {(provider.phone || provider.website) && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-t-0 border-amber-300 border-l-4 rounded-b-2xl flex-wrap pointer-events-none select-none">
                      {provider.phone && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-white border border-amber-200 rounded-lg px-3 py-1.5">
                          <i className="fas fa-phone text-[10px]"></i>Call
                        </span>
                      )}
                      {provider.website && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-white border border-amber-200 rounded-lg px-3 py-1.5">
                          <i className="fas fa-globe text-[10px]"></i>Website
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 text-center pt-0.5">This is how your listing appears to customers in the directory.</p>
                </div>
              )}

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
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 bg-amber-200 text-amber-400 font-bold px-4 py-2.5 rounded-xl text-xs cursor-not-allowed"
                  >
                    <i className="fas fa-star text-[10px]"></i>
                    Reserve My Spot — Coming Soon
                  </button>
                )
              )}
            </div>
          </div>
        </form>
        </>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const ProviderDetail: React.FC<ProviderDetailProps> = ({ providers, setProviders, reviews, setReviews, user }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const provider = providers.find(p => p.id === id);
  const providerReviews = reviews.filter(r => r.providerId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const navigate = useNavigate();
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

  if (!provider) return <div className="text-center py-12">Business not found.</div>;

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';
  const isOwner = (import.meta.env.DEV && !!user) || !!(user && provider.claimedBy === user.id);
  const img = providerImage(provider);
  const icon = categoryIcon[provider.category] || 'fa-store';
  const iconColor = categoryIconColor[provider.category] || 'text-slate-300';

  const handleDelete = () => {
    setConfirmModal({
      message: `Delete "${provider.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setDeleting(true);
        setDeleteError('');
        try {
          await deleteProvider(provider.id);
          setProviders(prev => prev.filter(p => p.id !== provider.id));
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
    setEFacebook(provider.facebook || '');
    setEWebsite(provider.website || '');
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
        facebook: eFacebook,
        website: eWebsite,
      });
      setProviders(prev => prev.map(p => p.id === updated.id ? updated : p));
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
      await deleteReviewReply(replyId);
      setReplies(prev => { const next = { ...prev }; delete next[reviewId]; return next; });
    } catch (e) {
      console.error(e);
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

      {/* Header Info */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-row gap-4">
        <div className="w-20 h-20 md:w-32 md:h-32 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
          {img
            ? <img src={img} loading="lazy" className="w-full h-full object-cover" alt="" />
            : <i className={`fas ${icon} text-3xl md:text-4xl ${iconColor}`}></i>
          }
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-semibold text-blue-600 px-2 py-0.5 bg-blue-50 rounded-lg">{provider.category}</span>
              <span className="text-slate-400 text-xs">• {provider.town}, KY</span>
              {provider.claimStatus !== 'claimed' && (
                <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-md">Unclaimed Listing</span>
              )}
              {provider.claimStatus === 'claimed' && (
                <span className="text-[10px] font-semibold text-emerald-700 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                  <i className="fas fa-circle-check mr-0.5 text-[8px]"></i>{provider.category === 'Churches' ? 'Verified Listing' : 'Verified Business'}
                </span>
              )}
              {provider.listingTier === 'featured' && (
                <span className="text-[10px] font-semibold text-amber-700 px-1.5 py-0.5 bg-amber-100 rounded-md border border-amber-200">
                  Sponsored
                </span>
              )}
              {provider.listingTier === 'spotlight' && (
                <span className="text-[10px] font-bold text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded-md">
                  <i className="fas fa-star mr-0.5 text-[8px]"></i>Local Spotlight
                </span>
              )}
            </div>
            {isAdminOrMod && !editing && (
              <div className="flex gap-2">
                <button
                  onClick={openEdit}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <i className="fas fa-pen text-[10px]"></i>
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
                >
                  <i className="fas fa-trash text-[10px]"></i>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
          <h1 className="text-lg md:text-3xl font-bold text-slate-900 mb-1 truncate">{provider.name}</h1>
          {provider.subcategory && <p className="text-slate-600 text-sm mb-1">{provider.subcategory}</p>}
          {provider.description && <p className="text-slate-500 text-sm mb-2 leading-relaxed">{provider.description}</p>}

          {provider.address && (
            <p className="text-slate-500 text-xs mb-1 flex items-center gap-1">
              <i className="fas fa-location-dot text-slate-400 text-[10px]"></i>
              {provider.address}
            </p>
          )}
          {provider.hours && (
            <p className="text-slate-500 text-xs mb-2 flex items-center gap-1">
              <i className="fas fa-clock text-slate-400 text-[10px]"></i>
              {provider.hours}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {/* Claim CTA — unclaimed listings only, not already claimed by this user */}
      {provider.claimStatus !== 'claimed' && user && !claimSubmitted && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{provider.category === 'Churches' ? 'Do you represent this church?' : 'Is this your business?'}</p>
            <p className="text-slate-500 text-xs mt-0.5">{provider.category === 'Churches' ? 'Claim it for free to keep your info up to date.' : 'Claim it for free to update your info and respond to reviews.'}</p>
          </div>
          <button
            onClick={() => setShowClaimModal(true)}
            className="shrink-0 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors text-sm"
          >
            {provider.category === 'Churches' ? 'Claim This Listing' : 'Claim This Business'}
          </button>
        </div>
      )}

      {provider.claimStatus !== 'claimed' && !user && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{provider.category === 'Churches' ? 'Do you represent this church?' : 'Is this your business?'}</p>
            <p className="text-slate-500 text-xs mt-0.5">Create a free account to claim and manage this listing.</p>
          </div>
          <Link to="/auth" state={{ from: location.pathname }} className="shrink-0 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors text-sm">
            Sign Up to Claim
          </Link>
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
      {isOwner && (
        <OwnerDashboard
          provider={provider}
          userId={user!.id}
          onSaved={updated => setProviders(prev => prev.map(p => p.id === updated.id ? updated : p))}
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
                placeholder="facebook.com/yourbusiness"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={eFacebook}
                onChange={e => setEFacebook(e.target.value)}
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
                onChange={e => setEWebsite(e.target.value)}
              />
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
          <Link
            to={`/review/${provider.id}`}
            className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
          >
            Write a Review
          </Link>
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
                  {isAdminOrMod && (
                    <button
                      onClick={() => setConfirmModal({
                        message: 'Delete this review? This cannot be undone.',
                        onConfirm: async () => {
                          setConfirmModal(null);
                          await deleteReview(review.id);
                          setReviews(prev => prev.filter(r => r.id !== review.id));
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
                      <button
                        onClick={() => handleDeleteReply(replies[review.id].id, review.id)}
                        className="text-slate-300 hover:text-red-400 text-xs transition-colors"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{replies[review.id].replyText}</p>
                </div>
              ) : isOwner && (
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

      {/* Transparency + update request */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-2 border-t border-slate-100">
        <p className="text-slate-400 text-xs">
          Business information sourced from publicly available data. Owners must claim their business to request updates or removal.
        </p>
        {isOwner && provider.claimStatus === 'claimed' && (
          <button
            onClick={() => setShowUpdateModal(true)}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors shrink-0"
          >
            Request updates or removal
          </button>
        )}
      </div>

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
