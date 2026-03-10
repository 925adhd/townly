
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CommunityEvent, SpotlightBooking } from '../types';
import { fetchApprovedCommunityEvents, submitCommunityEvent, fetchCurrentWeekSubmissions } from '../lib/api';
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
  // DB-driven flyer lightbox — stores the image URL to show, or null
  const [dbFlyerUrl, setDbFlyerUrl] = useState<string | null>(null);

  // Current-week paid submissions
  const [weekSubmissions, setWeekSubmissions] = useState<SpotlightBooking[]>([]);

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
    fetchCurrentWeekSubmissions()
      .then(setWeekSubmissions)
      .catch(console.error);
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

  function formatEventDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const dbSpotlight = weekSubmissions.find(s => s.type === 'spotlight') ?? null;
  const dbFeatured = weekSubmissions.filter(s => s.type === 'featured');

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

          {dbSpotlight ? (
            /* ── DB-driven spotlight ── */
            <div className="rounded-3xl border-2 border-amber-400 overflow-hidden shadow-xl flex flex-col bg-gradient-to-br from-amber-50 to-orange-50/60">
              {dbSpotlight.imageUrl && (
                <button
                  onClick={() => dbSpotlight.flyerUrl && setDbFlyerUrl(dbSpotlight.flyerUrl)}
                  className={`w-full block transition-opacity focus:outline-none ${dbSpotlight.flyerUrl ? 'hover:opacity-95 cursor-pointer' : 'cursor-default'}`}
                  aria-label={dbSpotlight.flyerUrl ? 'View full flyer' : undefined}
                >
                  <img
                    src={dbSpotlight.imageUrl}
                    alt={dbSpotlight.title}
                    loading="lazy"
                    className="w-full max-h-[260px] object-cover object-top"
                  />
                </button>
              )}
              <div className="p-7 flex flex-col gap-3">
                {dbSpotlight.eventDate && (
                  <span className="text-slate-400 text-xs font-medium">{formatEventDate(dbSpotlight.eventDate)}</span>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{dbSpotlight.title}</h3>
                  {dbSpotlight.location && (
                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                      <i className="fas fa-map-marker-alt text-orange-400"></i> {dbSpotlight.location}
                      {dbSpotlight.town && <span className="text-slate-300 mx-1">·</span>}
                      {dbSpotlight.town}
                    </p>
                  )}
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{dbSpotlight.description}</p>
                {dbSpotlight.flyerUrl && (
                  <button
                    onClick={() => setDbFlyerUrl(dbSpotlight.flyerUrl!)}
                    className="self-start inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1"
                  >
                    <i className="fas fa-file-image text-[10px]"></i> View Flyer
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── Hardcoded fallback spotlight ── */
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
                <span className="text-slate-400 text-xs font-medium">Apr 2, 2026</span>
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
          )}

        </div>
      </div>

      {/* Featured Listings */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 px-1 -mt-4">Featured Listings</h2>
        <p className="text-slate-400 text-xs mb-4 px-1">Paid listings from local businesses and organizations this week.</p>
        <div className="grid md:grid-cols-2 gap-4">

          {dbFeatured.length > 0 ? (
            /* ── DB-driven featured cards ── */
            dbFeatured.map(sub => (
              <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">Featured Listing</span>
                  {sub.eventDate && <span className="text-slate-400 text-xs">{formatEventDate(sub.eventDate)}</span>}
                </div>
                {sub.imageUrl && (
                  <img src={sub.imageUrl} alt={sub.title} loading="lazy" className="w-full max-h-[160px] object-cover rounded-xl" />
                )}
                <h3 className="font-bold text-slate-900 text-sm leading-tight">{sub.title}</h3>
                {sub.location && (
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> {sub.location}
                    {sub.town && <><span className="text-slate-300 mx-1">·</span>{sub.town}</>}
                  </p>
                )}
                <p className="text-slate-500 text-xs leading-relaxed">{sub.description}</p>
                {sub.flyerUrl && (
                  <button
                    onClick={() => setDbFlyerUrl(sub.flyerUrl!)}
                    className="self-start inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-1"
                  >
                    <i className="fas fa-file-image text-[10px]"></i> View Flyer
                  </button>
                )}
              </div>
            ))
          ) : (
            /* ── Hardcoded fallback featured cards ── */
            <>
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
            </>
          )}

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
            <Link
              to={user ? '/book/spotlight' : '/auth?signup=true'}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors text-sm"
            >
              <i className="fas fa-star"></i>
              {user ? 'Book a Weekly Spotlight' : 'Sign In to Book'}
            </Link>
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
            <Link
              to={user ? '/book/featured' : '/auth?signup=true'}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
            >
              <i className="fas fa-bullhorn text-[10px]"></i>
              {user ? 'Get Featured This Week' : 'Sign In to Book'}
            </Link>
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
            <p className="text-xs text-slate-300">Free posts are text-only. <Link to={user ? '/book/featured' : '/auth?signup=true'} className="underline hover:text-slate-400 transition-colors" onClick={() => setShowForm(false)}>Upgrade to Featured</Link> to include an image.</p>
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

      {/* DB submission flyer modal */}
      {dbFlyerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDbFlyerUrl(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDbFlyerUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10" aria-label="Close flyer">
              <i className="fas fa-times text-sm"></i>
            </button>
            <img src={dbFlyerUrl} alt="Event flyer" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}



    </div>
  );
};

export default Spotlights;
