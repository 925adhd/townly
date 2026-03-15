
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchMyBookings, updateMyBooking, uploadSpotlightImage } from '../lib/api';
import type { SpotlightBooking } from '../types';

const TAGS = ['Family Friendly', 'All Ages Welcome', 'Free Admission', 'Food & Drink', 'Music', 'Arts & Crafts', 'Sports', 'Outdoors', 'Fundraiser', 'Business'];

interface Props {
  user: { id: string; name: string; email?: string } | null;
}

function statusBadge(status: SpotlightBooking['status']) {
  if (status === 'approved') return { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' };
  if (status === 'rejected') return { label: 'Rejected', cls: 'bg-red-100 text-red-600' };
  return { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700' };
}

function weekLabel(weekStart: string) {
  const d = new Date(weekStart + 'T00:00:00');
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function isPast(weekStart: string) {
  return new Date(weekStart) < new Date(new Date().setDate(new Date().getDate() - 6));
}

interface EditState {
  title: string;
  teaser: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  town: string;
  tags: string[];
  bannerFile: File | null;
  bannerPreview: string;
}

function initEdit(b: SpotlightBooking): EditState {
  return {
    title: b.title,
    teaser: b.teaser ?? '',
    description: b.description,
    eventDate: b.eventDate ?? '',
    eventTime: b.eventTime ?? '',
    location: b.location ?? '',
    town: b.town ?? '',
    tags: b.tags ?? [],
    bannerFile: null,
    bannerPreview: b.imageUrl ?? '',
  };
}

const MyBookings: React.FC<Props> = ({ user }) => {
  const location = useLocation();
  const [bookings, setBookings] = useState<SpotlightBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const bannerBlobRef = useRef<string | null>(null);

  // Revoke blob URL when edit is cancelled or component unmounts
  useEffect(() => {
    return () => {
      if (bannerBlobRef.current) URL.revokeObjectURL(bannerBlobRef.current);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchMyBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto pt-16 text-center space-y-4 px-4">
        <p className="text-slate-500 text-sm">You must be logged in to view your bookings.</p>
        <Link to="/auth?signup=true" state={{ from: location.pathname }} className="inline-block bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm">Sign In</Link>
      </div>
    );
  }

  function startEdit(b: SpotlightBooking) {
    setEditingId(b.id);
    setEditState(initEdit(b));
    setSaveError('');
    setSaveSuccess(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
    setSaveError('');
    setSaveSuccess(false);
  }

  function toggleTag(tag: string) {
    if (!editState) return;
    setEditState(s => s ? ({
      ...s,
      tags: s.tags.includes(tag) ? s.tags.filter(t => t !== tag) : [...s.tags, tag],
    }) : s);
  }

  async function handleSave(b: SpotlightBooking) {
    if (!editState) return;
    if (!editState.title.trim() || !editState.description.trim()) {
      setSaveError('Title and description are required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      let imageUrl = b.imageUrl ?? '';
      if (editState.bannerFile) {
        imageUrl = await uploadSpotlightImage(editState.bannerFile);
      }
      const updated = await updateMyBooking(b.id, {
        title: editState.title,
        teaser: editState.teaser || undefined,
        description: editState.description,
        eventDate: editState.eventDate || undefined,
        eventTime: editState.eventTime || undefined,
        location: editState.location || undefined,
        town: editState.town || undefined,
        tags: editState.tags,
        imageUrl,
        thumbnailUrl: b.thumbnailUrl,
        flyerUrl: b.flyerUrl,
      });
      setBookings(prev => prev.map(x => x.id === b.id ? updated : x));
      setSaveSuccess(true);
      setEditingId(null);
      setEditState(null);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-12 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track status and edit before going live</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/book/spotlight"
            className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <i className="fas fa-star text-[10px]"></i> Spotlight
          </Link>
          <Link
            to="/book/featured"
            className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <i className="fas fa-bullhorn text-[10px]"></i> Featured
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading…
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <i className="fas fa-calendar-plus text-slate-300 text-xl"></i>
          </div>
          <p className="text-slate-500 text-sm">No bookings yet.</p>
          <div className="flex justify-center gap-3">
            <Link to="/book/spotlight" className="text-sm font-bold text-orange-600 hover:underline">Book a Spotlight →</Link>
            <Link to="/book/featured" className="text-sm font-bold text-slate-500 hover:underline">Get Featured →</Link>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map(b => {
          const badge = statusBadge(b.status);
          const past = isPast(b.weekStart);
          const isEditing = editingId === b.id;
          const canEdit = !past && b.status !== 'rejected';

          return (
            <div key={b.id} className={`bg-white border rounded-2xl overflow-hidden transition-opacity ${past ? 'opacity-50' : 'border-slate-200'}`}>
              {/* Card header */}
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {b.imageUrl && (
                  <img src={b.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-tight break-words">{b.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {b.type === 'spotlight' ? '⭐ Weekly Spotlight' : '📢 Featured'} · {weekLabel(b.weekStart)}
                  </p>
                  {b.status === 'rejected' && b.adminNotes && (
                    <p className="text-xs text-red-500 mt-1 italic">Rejection note: "{b.adminNotes}"</p>
                  )}
                  {b.status === 'approved' && !past && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Goes live {new Date(b.weekStart + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at midnight
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => isEditing ? cancelEdit() : startEdit(b)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && editState && (
                <div className="border-t border-slate-100 px-5 py-5 space-y-4 bg-slate-50/60">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Edit Booking</p>

                  {/* Image */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Banner Image</p>
                    {editState.bannerPreview ? (
                      <div className="relative w-full max-w-xs">
                        <img src={editState.bannerPreview} alt="" className="w-full rounded-xl object-cover max-h-36" />
                        <button
                          type="button"
                          onClick={() => setEditState(s => s ? { ...s, bannerFile: null, bannerPreview: '' } : s)}
                          className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-red-500"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => bannerRef.current?.click()}
                        className="w-full max-w-xs border-2 border-dashed border-slate-200 rounded-xl py-6 text-slate-400 text-xs hover:border-orange-300 hover:text-orange-400 transition-colors flex flex-col items-center gap-1"
                      >
                        <i className="fas fa-image text-lg"></i>
                        <span>Upload new banner</span>
                      </button>
                    )}
                    <input
                      ref={bannerRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (bannerBlobRef.current) URL.revokeObjectURL(bannerBlobRef.current);
                        const url = URL.createObjectURL(f);
                        bannerBlobRef.current = url;
                        setEditState(s => s ? { ...s, bannerFile: f, bannerPreview: url } : s);
                      }}
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Title</label>
                    <input
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      value={editState.title}
                      onChange={e => setEditState(s => s ? { ...s, title: e.target.value } : s)}
                    />
                  </div>

                  {/* Teaser (spotlight only) */}
                  {b.type === 'spotlight' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Home Page Teaser <span className="font-normal text-slate-400">(max 120 chars)</span></label>
                      <textarea
                        rows={2}
                        maxLength={120}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                        value={editState.teaser}
                        onChange={e => setEditState(s => s ? { ...s, teaser: e.target.value } : s)}
                      />
                      <p className="text-[11px] text-slate-400 text-right mt-0.5">{editState.teaser.length}/120</p>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Description <span className="font-normal text-slate-400">(max 600 chars)</span></label>
                    <textarea
                      rows={4}
                      maxLength={600}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      value={editState.description}
                      onChange={e => setEditState(s => s ? { ...s, description: e.target.value } : s)}
                    />
                    <p className="text-[11px] text-slate-400 text-right mt-0.5">{editState.description.length}/600</p>
                  </div>

                  {/* Event date */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Event Date</label>
                    <input
                      type="date"
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      value={editState.eventDate}
                      onChange={e => setEditState(s => s ? { ...s, eventDate: e.target.value } : s)}
                    />
                  </div>

                  {/* Event time */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Event Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 6:00 PM – 9:00 PM"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      value={editState.eventTime}
                      onChange={e => setEditState(s => s ? { ...s, eventTime: e.target.value } : s)}
                    />
                  </div>

                  {/* Location / Town */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Location / Venue</label>
                      <input
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        value={editState.location}
                        onChange={e => setEditState(s => s ? { ...s, location: e.target.value } : s)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Town</label>
                      <input
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        value={editState.town}
                        onChange={e => setEditState(s => s ? { ...s, town: e.target.value } : s)}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                            editState.tags.includes(tag)
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                  <p className="text-[11px] text-slate-400">Saving will resubmit for admin approval before going live.</p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSave(b)}
                      className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save & Resubmit'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-sm text-slate-500 hover:text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saveSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg">
          Booking updated — pending re-approval.
        </div>
      )}
    </div>
  );
};

export default MyBookings;
