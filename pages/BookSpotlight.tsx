
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchBookedWeeks, uploadSpotlightImage, createCheckoutSession, submitSpotlightBooking, getWeekStart, formatWeekRange, fetchMyBookings, updateMyBooking, fetchMyClaimedListing } from '../lib/api';
import type { SpotlightBooking } from '../types';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface BookSpotlightProps {
  user: { id: string; name: string; email?: string } | null;
}

function getUpcomingWeeks(): Date[] {
  const weeks: Date[] = [];
  const start = getWeekStart(new Date());
  for (let i = 0; i < 8; i++) {
    const w = new Date(start);
    w.setDate(w.getDate() + i * 7);
    weeks.push(w);
  }
  return weeks;
}

function weekIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function ImageUploadSlot({
  label, sublabel, preview, onPick, onClear, aspectHint, aspectClass,
}: {
  label: string;
  sublabel?: string;
  preview: string;
  onPick: () => void;
  onClear: () => void;
  aspectHint: string;
  aspectClass?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1 min-h-[2.5rem]">
        {label}
        {sublabel && <span className="font-normal text-slate-400"> — {sublabel}</span>}
      </p>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            className={`w-full object-cover rounded-xl border border-slate-200 ${aspectClass ?? 'max-h-40'}`}
            alt="Preview"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-red-500"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-5 text-slate-400 hover:border-orange-300 hover:text-orange-400 transition-colors text-xs font-medium flex flex-col items-center gap-1"
        >
          <i className="fas fa-cloud-upload-alt text-xl"></i>
          <span>Click to upload</span>
          <span className="font-normal opacity-70">{aspectHint} · JPEG, PNG, WebP · max 5MB</span>
        </button>
      )}
    </div>
  );
}

const BookSpotlight: React.FC<BookSpotlightProps> = ({ user }) => {
  const { type } = useParams<{ type: 'spotlight' | 'featured' }>();
  const bookingType = type === 'featured' ? 'featured' : 'spotlight';
  const [isMember, setIsMember] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchMyClaimedListing().then(p => setIsMember(!!(p && p.listingTier === 'featured'))).catch(console.error);
  }, [user]);

  const [bookedWeeks, setBookedWeeks] = useState<{ spotlight: string[]; featured: { week: string; count: number }[] } | null>(null);
  const [weekStart, setWeekStart] = useState('');
  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
  const [desc, setDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [noDate, setNoDate] = useState(false);   // "No specific date"
  const [allDay, setAllDay] = useState(false);         // event runs all day
  const [noSetTime, setNoSetTime] = useState(false);   // no specific time at all
  const [noTown, setNoTown] = useState(false);   // "No physical location"
  // Structured time picker state — combined into eventTime string on submit
  const [startHour, setStartHour] = useState('');
  const [startMin, setStartMin] = useState('00');
  const [startAmPm, setStartAmPm] = useState('AM');
  const [endHour, setEndHour] = useState('');
  const [endMin, setEndMin] = useState('00');
  const [endAmPm, setEndAmPm] = useState('PM');
  const [hasEndTime, setHasEndTime] = useState(false);
  // Derived formatted string e.g. "4:30 – 6:30 PM" or "10:00 AM"
  function buildEventTime(): string {
    if (!startHour) return '';
    const start = `${startHour}:${startMin} ${startAmPm}`;
    if (!hasEndTime || !endHour) return start;
    // Omit redundant AM/PM on start if both share the same period
    const startLabel = startAmPm === endAmPm ? `${startHour}:${startMin}` : start;
    return `${startLabel} – ${endHour}:${endMin} ${endAmPm}`;
  }
  const eventTime = buildEventTime();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [town, setTown] = useState('');
  // Images
  const [sameImage, setSameImage] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState('');
  const bannerRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const flyerRef = useRef<HTMLInputElement>(null);
  const [tos, setTos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewFlyerOpen, setPreviewFlyerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [myBookings, setMyBookings] = useState<SpotlightBooking[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ title: string; teaser: string; description: string }>({ title: '', teaser: '', description: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const DRAFT_KEY = `townly_booking_draft_${bookingType}`;

  // Restore draft on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchBookedWeeks().then(setBookedWeeks).catch(console.error);
    fetchMyBookings().then(setMyBookings).catch(console.error);
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.teaser) setTeaser(d.teaser);
      if (d.desc) setDesc(d.desc);
      if (d.eventDate) setEventDate(d.eventDate);
      if (d.noDate != null) setNoDate(d.noDate);
      if (d.allDay != null) setAllDay(d.allDay);
      if (d.noSetTime != null) setNoSetTime(d.noSetTime);
      if (d.startHour) setStartHour(d.startHour);
      if (d.startMin) setStartMin(d.startMin);
      if (d.startAmPm) setStartAmPm(d.startAmPm);
      if (d.endHour) setEndHour(d.endHour);
      if (d.endMin) setEndMin(d.endMin);
      if (d.endAmPm) setEndAmPm(d.endAmPm);
      if (d.hasEndTime != null) setHasEndTime(d.hasEndTime);
      if (d.selectedTags) setSelectedTags(d.selectedTags);
      if (d.location) setLocation(d.location);
      if (d.town) setTown(d.town);
      if (d.noTown != null) setNoTown(d.noTown);
    } catch { /* ignore */ }
  }, []);

  // Auto-save draft whenever fields change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        title, teaser, desc, eventDate, noDate, allDay, noSetTime,
        startHour, startMin, startAmPm, endHour, endMin, endAmPm, hasEndTime,
        selectedTags, location, town, noTown,
      }));
    } catch { /* ignore quota errors */ }
  }, [
    title, teaser, desc, eventDate, noDate, allDay, noSetTime,
    startHour, startMin, startAmPm, endHour, endMin, endAmPm, hasEndTime,
    selectedTags, location, town, noTown,
  ]);

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="max-w-lg mx-auto pt-10 text-center space-y-4">
        <p className="text-slate-600 text-sm">You must be logged in to book a spotlight.</p>
        <Link to="/login?signup=true" className="inline-block bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
          Sign In / Create Account
        </Link>
      </div>
    );
  }

  function makeImageHandler(
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFile(file);
      setPreview(URL.createObjectURL(file));
    };
  }

  function clearImage(
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
    ref: React.RefObject<HTMLInputElement>,
  ) {
    setFile(null);
    setPreview('');
    if (ref.current) ref.current.value = '';
  }

  function tagColor(tag: string): string {
    const t = tag.toLowerCase();
    if (t.includes('free')) return 'bg-emerald-100 text-emerald-700';
    if (t.includes('community')) return 'bg-blue-100 text-blue-700';
    if (t.includes('grand opening') || t.includes('business')) return 'bg-amber-100 text-amber-700';
    if (t.includes('music')) return 'bg-purple-100 text-purple-700';
    if (t.includes('food')) return 'bg-orange-100 text-orange-700';
    if (t.includes('outdoor')) return 'bg-green-100 text-green-700';
    if (t.includes('fundraiser')) return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-600';
  }

  function formatEventDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Collect every missing required field and show them all at once
    const missing: string[] = [];
    if (!weekStart) missing.push('Select a week');
    if (!title.trim()) missing.push('Event title');
    if (bookingType === 'spotlight' && !teaser.trim()) missing.push('Home page teaser');
    if (!desc.trim()) missing.push('Event description');
    if (!noDate && !eventDate) missing.push('Event date (or check "No specific date")');
    if (!allDay && !noSetTime && !startHour) missing.push('Event time (or check "All day" / "No set time")');
    if (!noTown && !town) missing.push('Town (or check "Online or no specific location")');
    if (!noTown && !location.trim()) missing.push('Location / Venue (or check "Online or no specific location")');
    if (!bannerFile && !bannerPreview) missing.push(bookingType === 'spotlight' ? 'Banner image' : 'Image');
    if (!tos) missing.push('Agree to the content policy (checkbox at the bottom)');

    if (missing.length > 0) {
      setError('Please complete the following before continuing:\n• ' + missing.join('\n• '));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      // Upload images first so URLs are ready before redirecting
      const uploadIf = async (f: File | null) => f ? uploadSpotlightImage(f) : '';
      let bannerUrl = '', thumbnailUrl = '', flyerUrl = '';
      if (sameImage) {
        bannerUrl = thumbnailUrl = flyerUrl = await uploadIf(bannerFile);
      } else {
        [bannerUrl, thumbnailUrl, flyerUrl] = await Promise.all([
          uploadIf(bannerFile),
          uploadIf(thumbFile),
          uploadIf(flyerFile),
        ]);
      }

      const origin = window.location.origin;
      const successUrl = `${origin}/book/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/book/${bookingType}`;

      // Create Stripe session first so we have the sessionId to store with the booking
      const { url, sessionId } = await createCheckoutSession(bookingType, successUrl, cancelUrl);

      // Save booking to DB as 'pending' — webhook will flip to 'paid' after payment
      await submitSpotlightBooking(
        bookingType, title, desc, weekStart,
        eventDate, eventTime, location, town,
        user.name, user.email ?? '', '',
        bannerUrl, thumbnailUrl, flyerUrl,
        selectedTags,
        bookingType === 'spotlight' ? teaser : undefined,
        sessionId,
        'unpaid',
      );

      // Keep only the type in sessionStorage so BookingSuccess knows what to display
      sessionStorage.setItem('townly_pending_booking', JSON.stringify({ type: bookingType }));
      localStorage.removeItem(DRAFT_KEY);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setSubmitting(false);
    }
    // Note: setSubmitting(false) intentionally omitted on success — page is navigating away
  }

  return (
    <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors flex-shrink-0"
        >
          <i className="fas fa-arrow-left text-sm"></i>
        </button>
        {bookingType === 'spotlight' ? (
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <i className="fas fa-star text-amber-500"></i>
          </div>
        ) : (
          <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <i className="fas fa-bullhorn text-slate-400"></i>
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {bookingType === 'spotlight' ? 'Book a Weekly Spotlight' : 'Get Featured This Week'}
          </h1>
          <p className="text-xs text-slate-400">
            {bookingType === 'spotlight'
              ? isMember ? '$20 / week · Member Rate · Only 1 available per week' : '$25 / week · Only 1 available per week'
              : isMember ? '$4 / week · Member Rate · Up to 5 slots per week' : '$5 / week · Up to 5 slots per week'}
          </p>
        </div>
      </div>

      {/* Featured slot availability banner */}
      {bookingType === 'featured' && bookedWeeks && (() => {
        const refWeek = weekStart || weekIsoDate(getWeekStart(new Date()));
        const taken = (bookedWeeks.featured ?? []).find(f => f.week === refWeek)?.count ?? 0;
        const slotsLeft = 5 - taken;
        const weekLabel = formatWeekRange(new Date(refWeek + 'T00:00:00'));
        return (
          <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium ${
            slotsLeft === 0
              ? 'bg-red-50 border-red-200 text-red-700'
              : slotsLeft <= 2
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <i className={`fas ${slotsLeft === 0 ? 'fa-ban' : slotsLeft <= 2 ? 'fa-exclamation-triangle' : 'fa-check-circle'} text-base flex-shrink-0`}></i>
            <span>
              {slotsLeft === 0
                ? <>Week of <strong>{weekLabel}</strong> is fully booked — select another week below.</>
                : <><strong>{slotsLeft} of 5 slots</strong> available{weekStart ? <> for week of <strong>{weekLabel}</strong></> : ' this week'}</>
              }
            </span>
          </div>
        );
      })()}

      {/* My Bookings panel */}
      {myBookings.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Bookings</p>
          {myBookings.map((b: SpotlightBooking) => {
            const isPast = new Date(b.weekStart) < new Date(new Date().setDate(new Date().getDate() - 6));
            const weekLabel = (() => {
              const d = new Date(b.weekStart + 'T00:00:00');
              const end = new Date(d); end.setDate(end.getDate() + 6);
              return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            })();
            const statusBadge = b.status === 'approved'
              ? { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' }
              : b.status === 'rejected'
              ? { label: 'Rejected', cls: 'bg-red-100 text-red-600' }
              : { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700' };
            const canEdit = !isPast && b.status !== 'rejected';
            const isEditing = editingId === b.id;
            return (
              <div key={b.id} className={`bg-white border rounded-xl px-4 py-3 flex flex-col gap-3 ${isPast ? 'opacity-50' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{b.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {b.type === 'spotlight' ? '⭐ Spotlight' : '📢 Featured'} · Week of {weekLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
                    {b.status === 'approved' && !isPast && (
                      <span className="text-[10px] text-slate-400">Goes live {new Date(b.weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                    {b.status === 'rejected' && b.adminNotes && (
                      <span className="text-[10px] text-slate-400 italic truncate max-w-[140px]">"{b.adminNotes}"</span>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) { setEditingId(null); setEditError(''); return; }
                          setEditingId(b.id);
                          setEditFields({ title: b.title, teaser: b.teaser ?? '', description: b.description });
                          setEditError('');
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    {b.type === 'spotlight' && (
                      <>
                        <input
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                          placeholder="Title"
                          value={editFields.title}
                          onChange={e => setEditFields(f => ({ ...f, title: e.target.value }))}
                        />
                        <textarea
                          rows={2}
                          maxLength={120}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                          placeholder="Home page teaser (max 120 chars)"
                          value={editFields.teaser}
                          onChange={e => setEditFields(f => ({ ...f, teaser: e.target.value }))}
                        />
                      </>
                    )}
                    {b.type === 'featured' && (
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Title"
                        value={editFields.title}
                        onChange={e => setEditFields(f => ({ ...f, title: e.target.value }))}
                      />
                    )}
                    <textarea
                      rows={3}
                      maxLength={600}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      placeholder="Full description (max 600 chars)"
                      value={editFields.description}
                      onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                    />
                    {editError && <p className="text-xs text-red-500">{editError}</p>}
                    <p className="text-[11px] text-slate-400">Saving will resubmit for admin approval before going live.</p>
                    <button
                      type="button"
                      disabled={editSaving}
                      onClick={async () => {
                        if (!editFields.title.trim() || !editFields.description.trim()) {
                          setEditError('Title and description are required.');
                          return;
                        }
                        setEditSaving(true);
                        setEditError('');
                        try {
                          const updated = await updateMyBooking(b.id, {
                            title: editFields.title,
                            teaser: editFields.teaser || undefined,
                            description: editFields.description,
                            eventDate: b.eventDate,
                            eventTime: b.eventTime,
                            location: b.location,
                            town: b.town,
                            tags: b.tags,
                            imageUrl: b.imageUrl,
                            thumbnailUrl: b.thumbnailUrl,
                            flyerUrl: b.flyerUrl,
                          });
                          setMyBookings(prev => prev.map(x => x.id === b.id ? updated : x));
                          setEditingId(null);
                        } catch (err: any) {
                          setEditError(err.message || 'Failed to save.');
                        } finally {
                          setEditSaving(false);
                        }
                      }}
                      className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                    >
                      {editSaving ? 'Saving…' : 'Save & Resubmit'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* Week */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Select Week <span className="text-red-400">*</span>
          </label>
          <p className="text-xs text-slate-400 mb-2">Weeks available up to 2 months in advance.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {getUpcomingWeeks().map(week => {
              const iso = weekIsoDate(week);
              const label = formatWeekRange(week);
              const isSpotlightTaken = bookingType === 'spotlight' && (bookedWeeks?.spotlight ?? []).includes(iso);
              const featuredCount = (bookedWeeks?.featured ?? []).find(f => f.week === iso)?.count ?? 0;
              const isFeaturedFull = bookingType === 'featured' && featuredCount >= 5;
              const isUnavailable = isSpotlightTaken || isFeaturedFull;
              const isSelected = weekStart === iso;
              const badge = isUnavailable
                ? { label: isSpotlightTaken ? 'Booked' : 'Full', cls: 'bg-slate-100 text-slate-400' }
                : bookingType === 'featured' && featuredCount > 0
                ? { label: `${5 - featuredCount} left`, cls: 'bg-amber-100 text-amber-600' }
                : { label: 'Available', cls: 'bg-emerald-100 text-emerald-600' };
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => setWeekStart(iso)}
                  className={`text-left px-3 py-3 rounded-xl border text-xs font-medium transition-all flex flex-col gap-1.5 ${
                    isUnavailable
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : isSelected
                      ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/40'
                  }`}
                >
                  <span className="font-semibold text-[11px] leading-tight">{label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full self-start ${badge.cls}`}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="e.g. Grand Opening – Sunrise Bakery"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Description — spotlight gets two fields; featured gets one */}
        {bookingType === 'spotlight' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Home Page Teaser <span className="text-red-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-2">Short hook shown on the home page preview — keep it punchy. Max 120 characters.</p>
              <textarea
                rows={2}
                maxLength={120}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
                placeholder="e.g. Free admission. Open to all ages. Don't miss it!"
                value={teaser}
                onChange={e => setTeaser(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 text-right mt-0.5">{teaser.length}/120</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Full Description <span className="text-red-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-2">Shown on the Events page. Include all the details. Max 600 characters.</p>
              <textarea
                rows={4}
                maxLength={600}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
                placeholder="What's happening, who should come, what to expect…"
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 text-right mt-0.5">{desc.length}/600</p>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              maxLength={600}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
              placeholder="What should people know?"
              value={desc}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDesc(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 text-right mt-0.5">{desc.length}/600</p>
          </div>
        )}

        {/* Date + Time + Town */}
        <div className="grid grid-cols-2 gap-3">

          {/* Event Date */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Date <span className="text-red-400">*</span></label>
            {!noDate ? (
              <button
                type="button"
                onClick={() => {
                  if (eventDate) {
                    const [y, m] = eventDate.split('-').map(Number);
                    setCalYear(y); setCalMonth(m - 1);
                  }
                  setDatePickerOpen(true);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-left flex items-center gap-2 hover:border-orange-300 focus:ring-2 focus:ring-orange-400 outline-none transition-colors"
              >
                <i className="fas fa-calendar text-amber-400 text-xs flex-shrink-0"></i>
                <span className={eventDate ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                  {eventDate ? formatEventDate(eventDate) : 'Tap to set date…'}
                </span>
                {eventDate && <i className="fas fa-pencil-alt text-slate-300 text-[10px] ml-auto"></i>}
              </button>
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 italic">No specific date</div>
            )}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noDate}
                onChange={e => { setNoDate(e.target.checked); if (e.target.checked) setEventDate(''); }}
                className="accent-orange-500"
              />
              <span className="text-xs text-slate-500">No specific date (ongoing or recurring)</span>
            </label>
          </div>

          {/* Event Time */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Time <span className="text-red-400">*</span></label>
            {!(allDay || noSetTime) ? (
              <button
                type="button"
                onClick={() => setTimePickerOpen(true)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-left flex items-center gap-2 hover:border-orange-300 focus:ring-2 focus:ring-orange-400 outline-none transition-colors"
              >
                <i className="fas fa-clock text-amber-400 text-xs flex-shrink-0"></i>
                <span className={eventTime ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                  {eventTime || 'Tap to set time…'}
                </span>
                {eventTime && <i className="fas fa-pencil-alt text-slate-300 text-[10px] ml-auto"></i>}
              </button>
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 italic">
                {allDay ? 'All day' : 'No set time'}
              </div>
            )}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={e => { setAllDay(e.target.checked); if (e.target.checked) { setNoSetTime(false); setStartHour(''); setHasEndTime(false); setEndHour(''); } }}
                  className="accent-orange-500"
                />
                <span className="text-xs text-slate-500">All day</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noSetTime}
                  onChange={e => { setNoSetTime(e.target.checked); if (e.target.checked) { setAllDay(false); setStartHour(''); setHasEndTime(false); setEndHour(''); } }}
                  className="accent-orange-500"
                />
                <span className="text-xs text-slate-500">No set time</span>
              </label>
            </div>
          </div>

          {/* Town */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town <span className="text-red-400">*</span></label>
            {!noTown ? (
              <select
                disabled={noTown}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none disabled:opacity-40"
                value={town}
                onChange={e => setTown(e.target.value)}
              >
                <option value="">Select a town…</option>
                {tenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 italic">No physical location</div>
            )}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noTown}
                onChange={e => { setNoTown(e.target.checked); if (e.target.checked) setTown(''); }}
                className="accent-orange-500"
              />
              <span className="text-xs text-slate-500">Online or no specific location</span>
            </label>
          </div>

        </div>

        {/* Tags / Pills */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tags <span className="font-normal normal-case">(optional)</span></label>
          <div className="flex flex-wrap gap-2">
            {['Free Admission', 'All Ages Welcome', 'Family Friendly', 'Community Event', 'Live Music', 'Food & Drinks', 'Outdoor Event', 'Fundraiser', 'Grand Opening', 'Business Event'].map(tag => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-orange-100 border-orange-400 text-orange-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600'
                  }`}
                >
                  {active && <i className="fas fa-check mr-1 text-[10px]"></i>}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Venue <span className="text-red-400">*</span></label>
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="e.g. Centre on Main or 425 S. Main St — no need to include the town"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        {/* Images */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {bookingType === 'spotlight' ? 'Images' : 'Image'}<span className="text-red-400 ml-1">*</span>
          </p>

          {/* Hidden file inputs */}
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={makeImageHandler(setBannerFile, setBannerPreview)} />
          <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={makeImageHandler(setThumbFile, setThumbPreview)} />
          <input ref={flyerRef} type="file" accept="image/*" className="hidden" onChange={makeImageHandler(setFlyerFile, setFlyerPreview)} />

          {/* Spotlight only: "same image" toggle — shown before the slots */}
          {bookingType === 'spotlight' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sameImage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSameImage(e.target.checked)}
                className="accent-orange-500"
              />
              <span className="text-xs text-slate-500">I only have one image (use for all slots)</span>
            </label>
          )}

          {bookingType === 'featured' ? (
            /* Featured: single flyer image only */
            <ImageUploadSlot
              label="Flyer / Image"
              sublabel="Shown on the card and opens full-size when tapped"
              preview={flyerPreview}
              onPick={() => flyerRef.current?.click()}
              onClear={() => clearImage(setFlyerFile, setFlyerPreview, flyerRef)}
              aspectHint="Any aspect ratio · portrait recommended"
              aspectClass="max-h-48"
            />
          ) : sameImage ? (
            /* Spotlight — same image for all slots */
            <ImageUploadSlot
              label="Image"
              sublabel="Used for banner, thumbnail, and flyer"
              preview={bannerPreview}
              onPick={() => bannerRef.current?.click()}
              onClear={() => clearImage(setBannerFile, setBannerPreview, bannerRef)}
              aspectHint="Any aspect ratio"
            />
          ) : (
            /* Spotlight — separate images */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ImageUploadSlot
                label="Banner — 16:9 landscape"
                sublabel="Shown on the Events page card"
                preview={bannerPreview}
                onPick={() => bannerRef.current?.click()}
                onClear={() => clearImage(setBannerFile, setBannerPreview, bannerRef)}
                aspectHint="16:9 recommended (e.g. 1200×675)"
                aspectClass="aspect-video"
              />
              <ImageUploadSlot
                label="Thumbnail — 1:1 square"
                sublabel="Shown as a preview on the Home page"
                preview={thumbPreview}
                onPick={() => thumbRef.current?.click()}
                onClear={() => clearImage(setThumbFile, setThumbPreview, thumbRef)}
                aspectHint="1:1 recommended (e.g. 600×600)"
                aspectClass="aspect-square"
              />
              <ImageUploadSlot
                label="Flyer — portrait"
                sublabel="Opens full-size when tapped"
                preview={flyerPreview}
                onPick={() => flyerRef.current?.click()}
                onClear={() => clearImage(setFlyerFile, setFlyerPreview, flyerRef)}
                aspectHint="3:4 recommended (e.g. 900×1200)"
                aspectClass="aspect-[3/4]"
              />
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Card Preview</p>
            <span className="text-[10px] text-slate-300 font-medium">Updates as you fill in the form</span>
          </div>

          {bookingType === 'spotlight' ? (
            <div className="space-y-4">
              {/* Spotlight — Home page preview */}
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Home page</p>
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 border-l-4 border-l-amber-400 flex flex-col md:flex-row md:items-center md:gap-6 px-6 py-[18px]">
                <div className="hidden md:block flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-100 bg-amber-100/60">
                  {(sameImage ? bannerPreview : thumbPreview || bannerPreview) ? (
                    <img
                      src={sameImage ? bannerPreview : (thumbPreview || bannerPreview)}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'center 15%' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-300">
                      <i className="fas fa-image text-xl"></i>
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-amber-100 text-amber-700">⭐ Weekly Spotlight</span>
                  </div>
                  {eventDate && (
                    <span className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                      <i className="fas fa-calendar text-amber-500 text-[10px]"></i>
                      {formatEventDate(eventDate)}
                      {(eventTime || allDay || noSetTime) && (
                        <span className="text-amber-600"> · {allDay ? 'All day' : noSetTime ? 'No set time' : eventTime}</span>
                      )}
                    </span>
                  )}
                  <h3 className="font-bold text-slate-900 text-xl leading-tight break-words">
                    {title || <span className="text-slate-300 italic font-normal text-base">Your event title…</span>}
                  </h3>
                  {(location || town) && (
                    <p className="text-slate-500 text-xs flex items-center gap-1 break-words">
                      <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i>
                      {location}{location && town && <span className="text-slate-300 mx-1">·</span>}{town}
                    </p>
                  )}
                  <p className="text-slate-600 text-sm leading-relaxed mt-1 break-words">
                    {teaser || <span className="italic text-slate-300">Your home page teaser will appear here…</span>}
                  </p>
                </div>
              </div>

              {/* Spotlight — Events page card */}
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-1">Events page</p>
              <div className="rounded-3xl border-2 border-amber-400 overflow-hidden shadow-xl flex flex-col bg-gradient-to-br from-amber-50 to-orange-50/60">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="preview" className="w-full max-h-[260px] object-cover object-top" />
                ) : (
                  <div className="w-full h-32 bg-amber-100/60 flex items-center justify-center text-amber-300">
                    <i className="fas fa-image text-3xl"></i>
                  </div>
                )}
                <div className="p-7 flex flex-col gap-3">
                  {eventDate && (
                    <span className="text-slate-400 text-xs font-medium">{formatEventDate(eventDate)}</span>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight break-words">
                      {title || <span className="text-slate-300 italic font-normal">Your event title…</span>}
                    </h3>
                    {(location || town) && (
                      <p className="text-slate-500 text-xs mt-1 flex items-center gap-1 break-words">
                        <i className="fas fa-map-marker-alt text-orange-400"></i>
                        {location}{location && town && <span className="text-slate-300 mx-1">·</span>}{town}
                      </p>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed break-words">
                    {desc || <span className="italic text-slate-300">Your description will appear here…</span>}
                  </p>
                  {(eventTime || allDay || noSetTime || selectedTags.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(eventTime || allDay || noSetTime) && (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <i className="fas fa-clock text-amber-400"></i>
                            {allDay ? 'All day' : noSetTime ? 'No set time' : eventTime}
                          </div>
                          {selectedTags.length > 0 && <span className="text-slate-200">·</span>}
                        </>
                      )}
                      {selectedTags.map((tag: string) => (
                        <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagColor(tag)}`}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {flyerPreview && (
                    <button type="button" onClick={() => setPreviewFlyerOpen(true)} className="self-start inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1">
                      <i className="fas fa-file-image text-[10px]"></i> View Flyer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">Featured Listing</span>
                {eventDate && <span className="text-slate-400 text-xs">{formatEventDate(eventDate)}</span>}
              </div>
              {flyerPreview && (
                <img src={flyerPreview} alt="preview" className="w-full max-h-[160px] object-cover rounded-xl" />
              )}
              <h3 className="font-bold text-slate-900 text-sm leading-tight break-words">
                {title || <span className="text-slate-300 italic font-normal">Your event title…</span>}
              </h3>
              {(location || town) && (
                <p className="text-slate-500 text-xs flex items-center gap-1 break-words">
                  <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i>
                  {location}{location && town && <span className="text-slate-300 mx-1">·</span>}{town}
                </p>
              )}
              <p className="text-slate-500 text-xs leading-relaxed break-words">
                {desc || <span className="italic text-slate-300">Your description will appear here…</span>}
              </p>
              {(eventTime || allDay || noSetTime || selectedTags.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(eventTime || allDay || noSetTime) && (
                    <>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <i className="fas fa-clock text-amber-400 text-[10px]"></i>
                        {allDay ? 'All day' : noSetTime ? 'No set time' : eventTime}
                      </div>
                      {selectedTags.length > 0 && <span className="text-slate-200">·</span>}
                    </>
                  )}
                  {selectedTags.map((tag: string) => (
                    <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagColor(tag)}`}>{tag}</span>
                  ))}
                </div>
              )}
              {flyerPreview && (
                <button type="button" onClick={() => setPreviewFlyerOpen(true)} className="self-start inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1">
                  <i className="fas fa-file-image text-[10px]"></i> View Flyer
                </button>
              )}
            </div>
          )}
        </div>

        {/* ToS */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={tos} onChange={e => setTos(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-orange-500" />
          <span className="text-xs text-slate-500 leading-relaxed">
            I agree that posts violating community standards (misleading, obscene, or fraudulent content) may be removed by the admin <strong>without refund</strong> and may result in a permanent account ban.
          </span>
        </label>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl whitespace-pre-line">{error}</div>
        )}

        {/* Payment note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 flex items-start gap-2">
          <i className="fas fa-lock mt-0.5 flex-shrink-0 text-slate-400"></i>
          <span>
            You'll be taken to Stripe's secure checkout to pay{' '}
            <strong>
              {bookingType === 'spotlight' ? (isMember ? '$20' : '$25') : (isMember ? '$4' : '$5')}
            </strong>
            {isMember && <span className="text-amber-600 font-semibold"> (member rate)</span>}
            .
            Your booking is submitted after payment is confirmed.
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors ${
            submitting
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : bookingType === 'spotlight'
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200'
              : 'bg-slate-800 hover:bg-slate-900 text-white'
          }`}
        >
          {submitting ? (
            <>
              <i className="fas fa-spinner fa-spin text-xs"></i>
              Processing…
            </>
          ) : (
            <>
              <i className="fas fa-lock text-xs"></i>
              {bookingType === 'spotlight'
                ? (isMember ? 'Pay $20 & Submit' : 'Pay $25 & Submit')
                : (isMember ? 'Pay $4 & Submit' : 'Pay $5 & Submit')}
            </>
          )}
        </button>

      </form>

      {/* Date Picker Modal */}
      {datePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDatePickerOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90dvh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Event Date</h3>
              <button type="button" onClick={() => setDatePickerOpen(false)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y: number) => y - 1); } else setCalMonth((m: number) => m - 1); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
              <span className="font-bold text-slate-900 text-sm">
                {new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y: number) => y + 1); } else setCalMonth((m: number) => m + 1); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
              ))}
              {/* Leading empty cells */}
              {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {/* Day buttons */}
              {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                const iso = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isSelected = eventDate === iso;
                const isToday = iso === new Date().toLocaleDateString('en-CA');
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setEventDate(iso)}
                    className={`w-full aspect-square rounded-xl text-sm font-semibold transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-sm'
                        : isToday
                        ? 'bg-amber-50 text-amber-700 border border-amber-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Selected date preview */}
            {eventDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <i className="fas fa-calendar text-amber-400"></i>
                <span className="font-semibold text-slate-800">{formatEventDate(eventDate)}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setDatePickerOpen(false)}
              disabled={!eventDate}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {eventDate ? 'Confirm' : 'Select a date to continue'}
            </button>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {timePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setTimePickerOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5 max-h-[90dvh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Event Time</h3>
              <button type="button" onClick={() => setTimePickerOpen(false)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Start time */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Start Time</p>
              <div className="grid grid-cols-6 gap-1.5">
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(h => (
                  <button key={h} type="button" onClick={() => setStartHour(h)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${startHour === h ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {h}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['00','15','30','45'].map(m => (
                  <button key={m} type="button" onClick={() => setStartMin(m)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${startMin === m ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    :{m}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['AM','PM'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setStartAmPm(p)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${startAmPm === p ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* End time */}
            {!hasEndTime ? (
              <button type="button" onClick={() => setHasEndTime(true)} className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1">
                <i className="fas fa-plus text-[10px]"></i> Add end time
              </button>
            ) : (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">End Time</p>
                  <button type="button" onClick={() => { setHasEndTime(false); setEndHour(''); }} className="text-[11px] text-slate-400 hover:text-red-400 font-semibold">Remove</button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {['1','2','3','4','5','6','7','8','9','10','11','12'].map(h => (
                    <button key={h} type="button" onClick={() => setEndHour(h)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${endHour === h ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {h}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['00','15','30','45'].map(m => (
                    <button key={m} type="button" onClick={() => setEndMin(m)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${endMin === m ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      :{m}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['AM','PM'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setEndAmPm(p)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${endAmPm === p ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live preview inside modal */}
            {eventTime && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <i className="fas fa-clock text-amber-400"></i>
                <span className="font-semibold text-slate-800">{eventTime}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setTimePickerOpen(false)}
              disabled={!startHour}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {startHour ? 'Confirm' : 'Select an hour to continue'}
            </button>
          </div>
        </div>
      )}

      {/* Preview flyer lightbox */}
      {previewFlyerOpen && flyerPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setPreviewFlyerOpen(false)}>
          <div className="relative max-w-lg w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <button onClick={() => setPreviewFlyerOpen(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10">
              <i className="fas fa-times text-sm"></i>
            </button>
            <img src={flyerPreview} alt="Flyer preview" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookSpotlight;
