
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Provider, Review, Category, Town } from '../types';
import { updateProvider, deleteProvider, deleteReview, updateOwnerListing, uploadOwnerPhoto, submitUpdateRequest } from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

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

const categories: Category[] = ['Home Services', 'Auto', 'Personal Care', 'Healthcare', 'Professional Services', 'Rentals'];
const towns: Town[] = tenant.towns;

const categoryIcon: Record<string, string> = {
  'Home Services': 'fa-house-chimney',
  'Auto': 'fa-car',
  'Personal Care': 'fa-scissors',
  'Healthcare': 'fa-stethoscope',
  'Professional Services': 'fa-briefcase',
  'Rentals': 'fa-key',
  'Restaurants': 'fa-utensils',
};

const categoryIconColor: Record<string, string> = {
  'Home Services': 'text-blue-300',
  'Auto': 'text-indigo-300',
  'Personal Care': 'text-pink-300',
  'Healthcare': 'text-emerald-300',
  'Professional Services': 'text-amber-300',
  'Rentals': 'text-purple-300',
  'Restaurants': 'text-red-300',
};

function providerImage(provider: Provider): string | null {
  if (provider.image) return provider.image;
  return null;
}

// ── Claim Modal ────────────────────────────────────────────────────────────────

interface ClaimModalProps {
  provider: Provider;
  onClose: () => void;
}

const ClaimModal: React.FC<ClaimModalProps> = ({ provider, onClose }) => {
  const contactEmail = getCurrentTenant().contactEmail;
  const subject = encodeURIComponent(`Business Claim: ${provider.name}`);
  const body = encodeURIComponent(
    `Hi,\n\nI am the owner of "${provider.name}" and would like to claim this listing.\n\nPlease find attached my official business photo and any updates I'd like made to the listing.\n\nThanks!`
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Claim This Business</h2>
            <p className="text-slate-500 text-sm mt-0.5">{provider.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-0.5">&times;</button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <i className="fas fa-envelope"></i>
            <span>Email us to get started</span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Send us an email from your <strong>official business email address</strong> and include:
          </p>
          <ul className="text-slate-600 text-sm space-y-1 pl-1">
            <li className="flex items-start gap-2"><i className="fas fa-check text-blue-400 mt-0.5 text-xs"></i>Your business photo or logo</li>
            <li className="flex items-start gap-2"><i className="fas fa-check text-blue-400 mt-0.5 text-xs"></i>Any info you'd like updated on your listing</li>
          </ul>
        </div>

        <a
          href={`mailto:${contactEmail}?subject=${subject}&body=${body}`}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
        >
          <i className="fas fa-envelope"></i>
          Email {contactEmail}
        </a>

        <p className="text-center text-xs text-slate-400">Claiming is always free.</p>
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
        message.trim(),
        user?.name ?? 'Anonymous',
        user?.id ?? ''
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
                  {t === 'update' ? 'Update Info' : 'Remove Listing'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {requestType === 'update' ? 'What needs to be updated?' : 'Why should this listing be removed?'}
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

  const [eDesc, setEDesc] = useState(provider.description ?? '');
  const [ePhone, setEPhone] = useState(provider.phone ?? '');
  const [eAddress, setEAddress] = useState(provider.address ?? '');
  const [eHours, setEHours] = useState(provider.hours ?? '');
  const [eFacebook, setEFacebook] = useState(provider.facebook ?? '');
  const [eWebsite, setEWebsite] = useState(provider.website ?? '');

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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visibility Upgrades</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Standard Listing</span>
                  <span className="text-sm font-bold text-slate-700">$5<span className="text-xs font-medium text-slate-400">/wk</span></span>
                </div>
                <p className="text-xs text-slate-500">Appears in category, searchable, normal display.</p>
                <p className="text-[10px] text-slate-400 italic">Founding Business Rate</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1"><i className="fas fa-star text-amber-400 text-xs"></i>Local Spotlight</span>
                  <span className="text-sm font-bold text-amber-700">$25<span className="text-xs font-medium text-amber-500">/wk</span></span>
                </div>
                <p className="text-xs text-slate-600">Top of homepage, pinned for the week. Only 1 available per week.</p>
                <p className="text-[10px] text-slate-400 italic">Founding Business Rate</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Upgrades are for visibility only. Claiming your listing is always free.</p>
          </div>
        </form>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const ProviderDetail: React.FC<ProviderDetailProps> = ({ providers, setProviders, reviews, setReviews, user }) => {
  const { id } = useParams<{ id: string }>();
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

  const [eName, setEName] = useState('');
  const [eCat, setECat] = useState<Category>('Home Services');
  const [eSub, setESub] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eTown, setETown] = useState<Town>(tenant.towns[0]);
  const [eFacebook, setEFacebook] = useState('');
  const [eWebsite, setEWebsite] = useState('');

  if (!provider) return <div className="text-center py-12">Business not found.</div>;

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';
  const isOwner = user && provider.claimedBy === user.id;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/directory" className="inline-flex items-center text-slate-500 hover:text-blue-600 font-medium text-sm transition-colors">
        <i className="fas fa-arrow-left mr-2"></i>
        Back to Directory
      </Link>

      {/* Header Info */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-row gap-4">
        <div className="w-20 h-20 md:w-32 md:h-32 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
          {img
            ? <img src={img} className="w-full h-full object-cover" alt="" />
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
                <span className="text-[10px] font-semibold text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded-md">
                  <i className="fas fa-check mr-0.5 text-[8px]"></i>Claimed
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
            <p className="font-semibold text-slate-900 text-sm">Is this your business?</p>
            <p className="text-slate-500 text-xs mt-0.5">Claim it for free to update your info and respond to reviews.</p>
          </div>
          <button
            onClick={() => setShowClaimModal(true)}
            className="shrink-0 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors text-sm"
          >
            Claim This Business
          </button>
        </div>
      )}

      {provider.claimStatus !== 'claimed' && !user && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 text-sm">Is this your business?</p>
            <p className="text-slate-500 text-xs mt-0.5">Create a free account to claim and manage this listing.</p>
          </div>
          <Link to="/auth" className="shrink-0 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors text-sm">
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                {provider.category === 'Restaurants' || provider.category === 'Healthcare' ? 'Would return' :
                 provider.category === 'Personal Care' ? 'Would book again' :
                 provider.category === 'Rentals' ? 'Would rent again' :
                 provider.category === 'Auto' ? 'Would use again' :
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
      </div>

      {/* Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Neighbor Reviews</h2>
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
            </div>
          ))}
          {providerReviews.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
               <p className="text-slate-500 italic">No reviews yet. Be the first to help your neighbors!</p>
            </div>
          )}
        </div>
      </div>

      {/* Transparency + update request */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-2 border-t border-slate-100">
        <p className="text-slate-400 text-xs">
          Business information sourced from publicly available data. Owners may claim or request updates.
        </p>
        <button
          onClick={() => setShowUpdateModal(true)}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors shrink-0"
        >
          Request updates or removal
        </button>
      </div>

      {/* Modals */}
      {showClaimModal && (
        <ClaimModal
          provider={provider}
          onClose={() => setShowClaimModal(false)}
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
