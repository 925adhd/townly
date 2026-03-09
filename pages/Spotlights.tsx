
import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CommunityEvent } from '../types';
import { fetchApprovedCommunityEvents, submitCommunityEvent, fetchBookedWeeks, uploadSpotlightImage, submitSpotlightBooking, getWeekStart, formatWeekRange } from '../lib/api';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface SpotlightsProps {
  user: { id: string; name: string; email?: string } | null;
}

const Spotlights: React.FC<SpotlightsProps> = ({ user }) => {
  const location = useLocation();
  useEffect(() => {
    const scrollTo = (location.state as any)?.scrollTo;
    if (scrollTo) {
      const el = document.getElementById(scrollTo);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
  }, [location.state]);
  const [flyerOpen, setFlyerOpen] = useState(false);
  const [upsOpen, setUpsOpen] = useState(false);
  const [entrepreneurOpen, setEntrepreneurOpen] = useState(false);

  // Booking modal state
  const [bookingType, setBookingType] = useState<'spotlight' | 'featured' | null>(null);
  const [bookedWeeks, setBookedWeeks] = useState<{ spotlight: string[]; featured: { week: string; count: number }[] } | null>(null);
  const [bWeekStart, setBWeekStart] = useState('');
  const [bTitle, setBTitle] = useState('');
  const [bDesc, setBDesc] = useState('');
  const [bEventDate, setBEventDate] = useState('');
  const [bLocation, setBLocation] = useState('');
  const [bTown, setBTown] = useState(tenant.towns[0] ?? '');
  const [bContactName, setBContactName] = useState('');
  const [bContactEmail, setBContactEmail] = useState('');
  const [bContactPhone, setBContactPhone] = useState('');
  const [bImageFile, setBImageFile] = useState<File | null>(null);
  const [bImagePreview, setBImagePreview] = useState('');
  const [bTos, setBTos] = useState(false);
  const [bSubmitting, setBSubmitting] = useState(false);
  const [bError, setBError] = useState('');
  const [bSuccess, setBSuccess] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Community events
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Submit form
  const [showForm, setShowForm] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eDate, setEDate] = useState('');
  const [eLocation, setELocation] = useState('');
  const [eTown, setETown] = useState(tenant.towns[0] ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchApprovedCommunityEvents()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitCommunityEvent(eTitle, eDesc, eDate, eLocation, eTown);
      setSubmitted(true);
      setShowForm(false);
      setETitle(''); setEDesc(''); setEDate(''); setELocation(''); setETown(tenant.towns[0] ?? '');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Build the next 8 week-start dates (Sundays) starting from this week
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

  function openBooking(type: 'spotlight' | 'featured') {
    setBookingType(type);
    setBWeekStart('');
    setBTitle(''); setBDesc(''); setBEventDate(''); setBLocation('');
    setBTown(tenant.towns[0] ?? '');
    setBContactName(''); setBContactEmail(''); setBContactPhone('');
    setBImageFile(null); setBImagePreview('');
    setBTos(false); setBError(''); setBSuccess(false);
    if (!bookedWeeks) {
      fetchBookedWeeks().then(setBookedWeeks).catch(console.error);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBImageFile(file);
    setBImagePreview(URL.createObjectURL(file));
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bTos) { setBError('Please agree to the content policy.'); return; }
    if (!bWeekStart) { setBError('Please select a week.'); return; }
    setBSubmitting(true);
    setBError('');
    try {
      let imageUrl = '';
      if (bImageFile) {
        imageUrl = await uploadSpotlightImage(bImageFile);
      }
      await submitSpotlightBooking(
        bookingType!,
        bTitle, bDesc, bWeekStart,
        bEventDate, bLocation, bTown,
        bContactName, bContactEmail, bContactPhone,
        imageUrl,
      );
      setBSuccess(true);
    } catch (err: any) {
      setBError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setBSubmitting(false);
    }
  }

  function formatEventDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-10 pb-10 -mt-6 md:mt-0">

      {/* Header */}
      <div className="pt-2 pb-3 md:pt-4 md:pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Around Town</h1>
        <p className="text-slate-500 text-sm">Events and announcements happening around {tenant.name} this week.</p>
      </div>

      {/* Current Spotlights */}
      <div>
        <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <i className="fas fa-star text-[9px]"></i> Weekly Spotlight
        </p>
<div className="grid gap-4">

          {/* Disaster Preparedness Summit */}
          <div id="disaster-summit" className="rounded-3xl border-2 border-amber-400 overflow-hidden shadow-xl flex flex-col bg-gradient-to-br from-amber-50 to-orange-50/60">
            <button
              onClick={() => setFlyerOpen(true)}
              className="w-full block hover:opacity-95 transition-opacity focus:outline-none"
              aria-label="View full flyer"
            >
              <img
                src="/images/disastersummit.jpg"
                alt="Grayson County Disaster Preparedness Summit flyer"
                loading="lazy"
                className="w-full max-h-[260px] object-cover object-top"
              />
            </button>
            <div className="p-7 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <span className="text-slate-400 text-xs font-medium">Apr 2, 2026</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">Grayson County Disaster Preparedness Summit</h3>
                <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                  <i className="fas fa-map-marker-alt text-orange-400"></i> Grayson County Extension Office · 64 Quarry Rd, Leitchfield
                </p>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Join the 2nd Annual Community Disaster Preparedness Summit — designed to help individuals, families, and organizations prepare for emergencies. Featuring a keynote from UK meteorologist Matt Dixon, panel discussions with local emergency officials, and a resource expo with interactive booths.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <i className="fas fa-clock text-amber-400"></i> 4:30 – 6:30 PM
                </div>
                <span className="text-slate-200">·</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Free Admission</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Community Event</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">All Ages Welcome</span>
              </div>
              <button
                onClick={() => setFlyerOpen(true)}
                className="self-start inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1"
              >
                <i className="fas fa-file-image text-[10px]"></i> View Flyer
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Featured Listings */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 px-1 -mt-4">Featured Listings</h2>
        <p className="text-slate-400 text-xs mb-4 px-1">Paid listings from local businesses and organizations this week.</p>
        <div className="grid md:grid-cols-2 gap-4">

          {/* Kids Entrepreneur Fair */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">Featured Listing</span>
              <span className="text-slate-400 text-xs">Mar 27, 2026</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">2nd Annual Kids Entrepreneur Fair</h3>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> Centre on Main · 425 S. Main Street, Leitchfield
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Grades K–12 showcase their businesses, hosted by YP of Grayson County. Kids get 30 min of early shopping before public viewing. Awards voted by peers prior to the event.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <i className="fas fa-clock text-amber-400 text-[10px]"></i> 5:00 – 7:00 PM
              </div>
              <span className="text-slate-200">·</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Free Entry</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Grades K–12</span>
            </div>
            <p className="text-[10px] text-slate-400 italic">Limited booths · Must register in advance</p>
            <button
              onClick={() => setEntrepreneurOpen(true)}
              className="self-start inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1"
            >
              <i className="fas fa-file-image text-[10px]"></i> View Flyer
            </button>
          </div>

          {/* UPS Store Ribbon Cutting */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">Featured Listing</span>
              <span className="text-slate-400 text-xs">Mar 2, 2026</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">Ribbon Cutting – The UPS Store (Leitchfield)</h3>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> 52 Public Square · Leitchfield, KY 42754
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Join the Grayson County Chamber of Commerce for a ribbon cutting ceremony celebrating The UPS Store's Leitchfield location. Come welcome the new business and support local growth.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <i className="fas fa-clock text-amber-400 text-[10px]"></i> 10:00 AM
              </div>
              <span className="text-slate-200">·</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chamber Event</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Business Opening</span>
            </div>
            <button
              onClick={() => setUpsOpen(true)}
              className="self-start inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1"
            >
              <i className="fas fa-file-image text-[10px]"></i> View Flyer
            </button>
          </div>

        </div>
      </div>

      {/* ── Community Events ── */}
      <div>
        <div className="flex items-center justify-between mb-1 px-1">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Community Events</h2>
            <p className="text-slate-400 text-xs mt-0.5">Free events posted by neighbors and organizations. <em>Community posts are text-only unless upgraded to Featured.</em></p>
          </div>
          {user ? (
            <button
              onClick={() => { setShowForm(true); setSubmitted(false); }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-1.5 rounded-xl shadow-sm transition-colors whitespace-nowrap"
            >
              <i className="fas fa-plus text-[10px]"></i> Post Event
            </button>
          ) : (
            <Link
              to="/auth?signup=true"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-1.5 rounded-xl shadow-sm transition-colors whitespace-nowrap"
            >
              <i className="fas fa-plus text-[10px]"></i> Post Event
            </Link>
          )}
        </div>

        {submitted && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
            <i className="fas fa-check-circle"></i>
            Event submitted! It will appear here once approved.
          </div>
        )}

        {loadingEvents ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-sm">
            <i className="fas fa-calendar-plus text-2xl mb-3 block text-slate-200"></i>
            No community events yet. Be the first to post one!
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.map(ev => (
              <div key={ev.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">Community Event</span>
                  <span className="text-slate-400 text-xs">{formatEventDate(ev.eventDate)}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">{ev.title}</h3>
                <p className="text-slate-500 text-xs flex items-center gap-1">
                  <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> {ev.location}
                  {ev.town && <span className="text-slate-300 mx-1">·</span>}
                  {ev.town}
                </p>
                <p className="text-slate-500 text-xs leading-relaxed">{ev.description}</p>
                <p className="text-[10px] text-slate-400">Posted by {ev.userName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing tiers */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 px-1">Get Your Event or Post Noticed</h2>
        <p className="text-slate-500 text-sm mb-4 px-1">Short-term visibility for events, announcements, and community posts. Looking to grow your business? See the directory listing options on your business page.</p>
        <div className="space-y-5">

          {/* Local Spotlight — full width */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-3xl p-8 space-y-3 shadow-md">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm">
              <i className="fas fa-star text-amber-500 text-xl"></i>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Weekly Spotlight</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              The most visible placement on Townly. Your event is pinned at the very top of the <strong>Home page and Events page</strong> for every neighbor who visits this week.
            </p>
            <div className="pt-1">
              <span className="text-3xl font-bold text-amber-600">$25</span>
              <span className="text-slate-400 text-sm font-medium"> / week</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Top placement on the Home page and Events page</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Gold highlighted spotlight card that stands out</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Large banner image displayed on the event listing</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Clickable flyer image for full details</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Thumbnail preview shown on the home page</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Use the same image or upload separate images for each placement</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Custom description</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Pinned above all other listings for the full week</li>
              <li className="flex items-center gap-2 font-semibold text-amber-700"><i className="fas fa-lock text-amber-500 text-xs"></i> Only 1 spotlight available each week</li>
            </ul>
            <p className="text-xs text-amber-700/80 font-medium">Ideal for grand openings, ticketed events, and time-sensitive announcements.</p>
            {user ? (
              <button
                onClick={() => openBooking('spotlight')}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors text-sm"
              >
                <i className="fas fa-star"></i>
                Book a Weekly Spotlight
              </button>
            ) : (
              <Link
                to="/auth?signup=true"
                className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors text-sm"
              >
                <i className="fas fa-star"></i>
                Sign In to Book
              </Link>
            )}
          </div>

          {/* Featured Post */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-bullhorn text-slate-400 text-base"></i>
            </div>
            <h2 className="text-base font-bold text-slate-800">Featured Post</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Boost a community post or event into the weekly featured section so it appears above regular posts for the week.
            </p>
            <div className="pt-0.5">
              <span className="text-xl font-bold text-slate-700">$5</span>
              <span className="text-slate-400 text-xs font-medium"> / week</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Rises above regular community posts</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Shown in the weekly featured section</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Flyer preview button included <em className="text-slate-400">(free community posts are text-only)</em></li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Custom description</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Active for the full week</li>
              <li className="flex items-center gap-2 font-semibold text-slate-600 text-sm"><i className="fas fa-lock text-slate-400 text-xs"></i> Limited to 5 featured posts per week</li>
            </ul>
            <p className="text-xs text-slate-400 font-medium">Great for yard sales, one-time events, community announcements, and seasonal posts.</p>
            {user ? (
              <button
                onClick={() => openBooking('featured')}
                className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
              >
                <i className="fas fa-bullhorn text-[10px]"></i>
                Get Featured This Week
              </button>
            ) : (
              <Link
                to="/auth?signup=true"
                className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
              >
                <i className="fas fa-bullhorn text-[10px]"></i>
                Sign In to Book
              </Link>
            )}
          </div>

        </div>

        {/* Content Policy Disclaimer */}
        <p className="text-xs text-slate-400 mt-4 px-1">
          By submitting a paid post you agree that content violating community standards — including misleading, obscene, or fraudulent posts — may be removed by the admin without refund, and may result in a permanent account ban.
        </p>
      </div>

      {/* Submit Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Post a Community Event</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="text-xs text-slate-400">Free to post. Events are reviewed before going live.</p>
            <p className="text-xs text-slate-300">Free posts are text-only. <a href="mailto:hello@townlyapp.io?subject=Featured Post Inquiry" className="underline hover:text-slate-400 transition-colors">Upgrade to Featured</a> to include an image.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Title</label>
                <input
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Community Clean-Up Day"
                  value={eTitle}
                  onChange={e => setETitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date</label>
                  <input
                    required
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={eDate}
                    onChange={e => setEDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={eTown}
                    onChange={e => setETown(e.target.value)}
                  >
                    {tenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Venue</label>
                <input
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Courthouse Square, Leitchfield"
                  value={eLocation}
                  onChange={e => setELocation(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="What's happening? Who should come?"
                  value={eDesc}
                  onChange={e => setEDesc(e.target.value)}
                />
              </div>
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-xl">{submitError}</div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors disabled:opacity-60 text-sm"
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Flyer modal */}
      {flyerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setFlyerOpen(false)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setFlyerOpen(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10" aria-label="Close flyer">
              <i className="fas fa-times text-sm"></i>
            </button>
            <img src="/images/disastersummit.jpg" alt="Grayson County Disaster Preparedness Summit flyer" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Kids Entrepreneur Fair modal */}
      {entrepreneurOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEntrepreneurOpen(false)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEntrepreneurOpen(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10" aria-label="Close image">
              <i className="fas fa-times text-sm"></i>
            </button>
            <img src="/images/entrepreneur.jpg" alt="2nd Annual Kids Entrepreneur Fair" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* UPS Store modal */}
      {upsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setUpsOpen(false)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setUpsOpen(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10" aria-label="Close image">
              <i className="fas fa-times text-sm"></i>
            </button>
            <img src="/images/ups.jpg" alt="Ribbon Cutting – The UPS Store Leitchfield" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingType && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setBookingType(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-6 pb-3 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {bookingType === 'spotlight' ? '⭐ Book a Weekly Spotlight' : '📣 Get Featured This Week'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {bookingType === 'spotlight' ? '$25 / week · Only 1 available per week' : '$5 / week · Up to 5 available per week'}
                </p>
              </div>
              <button onClick={() => setBookingType(null)} className="text-slate-400 hover:text-slate-600 transition-colors ml-4 flex-shrink-0">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {bSuccess ? (
              <div className="px-6 py-10 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <i className="fas fa-check text-emerald-500 text-2xl"></i>
                </div>
                <h4 className="text-lg font-bold text-slate-900">Submission Received!</h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  We'll review your submission and contact you at <strong>{bContactEmail}</strong> to confirm payment and publish your post.
                </p>
                <p className="text-xs text-slate-400">Payment: {bookingType === 'spotlight' ? '$25' : '$5'} — we'll send an invoice to your email.</p>
                <button onClick={() => setBookingType(null)} className="mt-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm">Done</button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="px-6 py-5 space-y-4">

                {/* Week Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Week <span className="text-red-400">*</span></label>
                  <div className="space-y-2">
                    {getUpcomingWeeks().map(week => {
                      const iso = weekIsoDate(week);
                      const label = formatWeekRange(week);
                      const isSpotlightTaken = bookingType === 'spotlight' && (bookedWeeks?.spotlight ?? []).includes(iso);
                      const featuredCount = (bookedWeeks?.featured ?? []).find(f => f.week === iso)?.count ?? 0;
                      const isFeaturedFull = bookingType === 'featured' && featuredCount >= 5;
                      const isUnavailable = isSpotlightTaken || isFeaturedFull;
                      const isSelected = bWeekStart === iso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => !isUnavailable && setBWeekStart(iso)}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                            isUnavailable
                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                              : isSelected
                              ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300'
                          }`}
                        >
                          <span>Sun–Sat &nbsp;{label}</span>
                          {isUnavailable ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                              {isSpotlightTaken ? 'Booked' : 'Full'}
                            </span>
                          ) : bookingType === 'featured' && featuredCount > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                              {5 - featuredCount} left
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">Available</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Title <span className="text-red-400">*</span></label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="e.g. Grand Opening – Sunrise Bakery" value={bTitle} onChange={e => setBTitle(e.target.value)} />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description <span className="text-red-400">*</span></label>
                  <textarea required rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none" placeholder="What should neighbors know?" value={bDesc} onChange={e => setBDesc(e.target.value)} />
                </div>

                {/* Date + Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Date</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" value={bEventDate} onChange={e => setBEventDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" value={bTown} onChange={e => setBTown(e.target.value)}>
                      {tenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Venue</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="e.g. Courthouse Square, Leitchfield" value={bLocation} onChange={e => setBLocation(e.target.value)} />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {bookingType === 'spotlight' ? 'Banner / Flyer Image' : 'Flyer Image (optional)'}
                    {bookingType === 'spotlight' && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {bImagePreview ? (
                    <div className="relative">
                      <img src={bImagePreview} className="w-full h-32 object-cover rounded-xl border border-slate-200" alt="Preview" />
                      <button type="button" onClick={() => { setBImageFile(null); setBImagePreview(''); if (imageInputRef.current) imageInputRef.current.value = ''; }} className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-red-500">
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-slate-400 hover:border-orange-300 hover:text-orange-400 transition-colors text-sm font-medium flex flex-col items-center gap-1">
                      <i className="fas fa-cloud-upload-alt text-xl"></i>
                      <span>Click to upload image</span>
                      <span className="text-xs font-normal">JPEG, PNG, WebP · max 5MB</span>
                    </button>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Name <span className="text-red-400">*</span></label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Your name" value={bContactName} onChange={e => setBContactName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Phone</label>
                      <input type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Optional" value={bContactPhone} onChange={e => setBContactPhone(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email <span className="text-red-400">*</span></label>
                    <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="We'll send your invoice here" value={bContactEmail} onChange={e => setBContactEmail(e.target.value)} />
                  </div>
                </div>

                {/* ToS */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={bTos} onChange={e => setBTos(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-orange-500" />
                  <span className="text-xs text-slate-500 leading-relaxed">
                    I agree that posts violating community standards (misleading, obscene, or fraudulent content) may be removed by the admin <strong>without refund</strong> and may result in a permanent account ban.
                  </span>
                </label>

                {bError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-xl">{bError}</div>
                )}

                {/* Payment note */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
                  <i className="fas fa-info-circle mt-0.5 flex-shrink-0"></i>
                  <span>Payment ({bookingType === 'spotlight' ? '$25' : '$5'}) will be collected after review. We'll email you an invoice within 1 business day.</span>
                </div>

                <button
                  type="submit"
                  disabled={bSubmitting || !bTos || !bWeekStart}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-sm transition-colors text-sm"
                >
                  {bSubmitting ? 'Submitting...' : `Submit for Review — ${bookingType === 'spotlight' ? '$25' : '$5'}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Spotlights;
