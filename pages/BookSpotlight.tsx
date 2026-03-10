
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchBookedWeeks, uploadSpotlightImage, submitSpotlightBooking, getWeekStart, formatWeekRange } from '../lib/api';
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
      <p className="text-xs font-semibold text-slate-500 mb-1">
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
  const navigate = useNavigate();

  const [bookedWeeks, setBookedWeeks] = useState<{ spotlight: string[]; featured: { week: string; count: number }[] } | null>(null);
  const [weekStart, setWeekStart] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [town, setTown] = useState(tenant.towns[0] ?? '');
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
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchBookedWeeks().then(setBookedWeeks).catch(console.error);
  }, []);

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="max-w-lg mx-auto pt-10 text-center space-y-4">
        <p className="text-slate-600 text-sm">You must be logged in to book a spotlight.</p>
        <Link to="/auth?signup=true" className="inline-block bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tos) { setError('Please agree to the content policy.'); return; }
    if (!weekStart) { setError('Please select a week.'); return; }
    setSubmitting(true);
    setError('');
    try {
      // Upload images
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
      await submitSpotlightBooking(
        bookingType,
        title, desc, weekStart,
        eventDate, eventTime, location, town,
        user.name, user.email ?? '', '',
        bannerUrl, thumbnailUrl, flyerUrl,
        selectedTags,
      );
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto pt-10 text-center space-y-4 px-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <i className="fas fa-check text-emerald-500 text-2xl"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Submission Received!</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          We'll review your submission and contact you at <strong>{user.email}</strong> to confirm payment and publish your post.
        </p>
        <p className="text-xs text-slate-400">Payment: {bookingType === 'spotlight' ? '$25' : '$5'} — we'll send an invoice to your email within 1 business day.</p>
        <Link to="/spotlights" className="inline-block mt-4 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-sm">
          Back to Events
        </Link>
      </div>
    );
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
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {bookingType === 'spotlight' ? '⭐ Book a Weekly Spotlight' : '📣 Get Featured This Week'}
          </h1>
          <p className="text-xs text-slate-400">
            {bookingType === 'spotlight' ? '$25 / week · Only 1 available per week' : '$5 / week · Up to 5 available per week'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Week */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Select Week <span className="text-red-400">*</span>
          </label>
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
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="e.g. Grand Opening – Sunrise Bakery"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            required
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
            placeholder="What should people know?"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
        </div>

        {/* Date + Time + Town */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Date</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Time</label>
            <input
              type="text"
              placeholder="e.g. 4:30 – 6:30 PM"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              value={eventTime}
              onChange={e => setEventTime(e.target.value)}
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              value={town}
              onChange={e => setTown(e.target.value)}
            >
              {tenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
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
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Venue</label>
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="e.g. Courthouse Square, Leitchfield"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        {/* Images */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Images{bookingType === 'spotlight' && <span className="text-red-400 ml-1">*</span>}
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sameImage}
                onChange={e => setSameImage(e.target.checked)}
                className="accent-orange-500"
              />
              <span className="text-xs text-slate-500">I only have one image</span>
            </label>
          </div>

          {/* Hidden file inputs */}
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={makeImageHandler(setBannerFile, setBannerPreview)} />
          <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={makeImageHandler(setThumbFile, setThumbPreview)} />
          <input ref={flyerRef} type="file" accept="image/*" className="hidden" onChange={makeImageHandler(setFlyerFile, setFlyerPreview)} />

          {sameImage ? (
            <ImageUploadSlot
              label="Image"
              sublabel="Used for banner, thumbnail, and flyer"
              preview={bannerPreview}
              onPick={() => bannerRef.current?.click()}
              onClear={() => clearImage(setBannerFile, setBannerPreview, bannerRef)}
              aspectHint="Any aspect ratio"
            />
          ) : (
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

        {/* Contact */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Info</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 flex items-center gap-2 flex-wrap">
            <span className="font-medium">{user.name}</span>
            <span className="text-slate-300">·</span>
            <span>{user.email}</span>
          </div>

        </div>

        {/* ToS */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={tos} onChange={e => setTos(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-orange-500" />
          <span className="text-xs text-slate-500 leading-relaxed">
            I agree that posts violating community standards (misleading, obscene, or fraudulent content) may be removed by the admin <strong>without refund</strong> and may result in a permanent account ban.
          </span>
        </label>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl">{error}</div>
        )}

        {/* Payment note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
          <i className="fas fa-info-circle mt-0.5 flex-shrink-0"></i>
          <span>
            Payment ({bookingType === 'spotlight' ? '$25' : '$5'}) will be collected after review.
            We'll email you an invoice within 1 business day.
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting || !tos || !weekStart}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-sm transition-colors text-sm"
        >
          {submitting ? 'Submitting...' : `Submit for Review — ${bookingType === 'spotlight' ? '$25' : '$5'}`}
        </button>

      </form>
    </div>
  );
};

export default BookSpotlight;
