
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CommunityEvent, CommunityPostType, SpotlightBooking } from '../types';
import { fetchApprovedCommunityEvents, submitCommunityEvent, fetchCurrentWeekSubmissions, deleteCommunityEvent, deleteOwnCommunityEvent, flagCommunityEvent } from '../lib/api';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface SpotlightsProps {
  user: { id: string; name: string; email?: string; role?: string } | null;
}

const Spotlights: React.FC<SpotlightsProps> = ({ user }) => {
  const location = useLocation();
  useEffect(() => {
    const scrollTo = (location.state as any)?.scrollTo;
    if (scrollTo) {
      const el = document.getElementById(scrollTo);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) { el.scrollIntoView({ block: 'start' }); return; }
    }
    const params = new URLSearchParams(location.search);
    const eventId = params.get('event');
    if (!eventId) { window.scrollTo(0, 0); }
  }, [location.search, location.state, location.hash]);

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
  const [ePostType, setEPostType] = useState<CommunityPostType>('event');
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

  // Scroll to shared event/spotlight/featured once loaded
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get('event');
    const spotlightId = params.get('spotlight');
    const featuredId = params.get('featured');
    const targetId = eventId ? `event-${eventId}` : spotlightId ? `booking-${spotlightId}` : featuredId ? `booking-${featuredId}` : null;
    if (!targetId || loadingEvents) return;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-orange-400');
    }
  }, [loadingEvents, location.search]);

  const isAdmin = user?.role === 'admin';

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteEvent = (id: string) => setDeleteConfirm({ id, isAdmin: true });
  const handleDeleteOwnEvent = (id: string) => setDeleteConfirm({ id, isAdmin: false });

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setDeleteError('');
    try {
      if (deleteConfirm.isAdmin) {
        await deleteCommunityEvent(deleteConfirm.id);
      } else {
        await deleteOwnCommunityEvent(deleteConfirm.id);
      }
      setEvents(prev => prev.filter(ev => ev.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleShareEvent = async (ev: CommunityEvent) => {
    const url = `${window.location.origin}/events?event=${ev.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Events — Grayson County Townly', url }); } catch { /* dismissed */ }
    } else {
      try { await navigator.clipboard.writeText(url); setCopiedEventId(ev.id); setTimeout(() => setCopiedEventId(null), 2500); } catch { /* silent */ }
    }
  };

  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [copiedBookingId, setCopiedBookingId] = useState<string | null>(null);

  const handleShareBooking = async (id: string, title: string, type: 'spotlight' | 'featured') => {
    const url = `${window.location.origin}/events?${type}=${id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${title} — Grayson County Townly`, url }); } catch { /* dismissed */ }
    } else {
      try { await navigator.clipboard.writeText(url); setCopiedBookingId(id); setTimeout(() => setCopiedBookingId(null), 2500); } catch { /* silent */ }
    }
  };

  const [flaggingEventId, setFlaggingEventId] = useState<string | null>(null);
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const handleFlagEvent = async (id: string, title: string) => {
    setFlagSubmitting(true);
    try {
      await flagCommunityEvent(id, title);
      setFlaggingEventId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to submit flag.');
    } finally {
      setFlagSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const newEvent = await submitCommunityEvent(eTitle, eDesc, eDate, eLocation, eTown, ePostType);
      setEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()));
      setSubmitted(true);
      setShowForm(false);
      setETitle(''); setEDesc(''); setEDate(''); setELocation(''); setETown(tenant.towns[0] ?? ''); setEPostType('event');
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

  const POST_TYPE_LABELS: Record<CommunityPostType, string> = {
    event: 'Community Event',
    announcement: 'Announcement',
    yard_sale: 'Yard Sale',
    free_item: 'Free Item',
    prayer_request: 'Prayer Request',
    other: 'Post',
  };

  const POST_TYPE_COLORS: Record<CommunityPostType, string> = {
    event: 'bg-blue-50 text-blue-600 border-blue-100',
    announcement: 'bg-amber-50 text-amber-700 border-amber-100',
    yard_sale: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    free_item: 'bg-green-50 text-green-600 border-green-200 shadow-md shadow-green-200',
    prayer_request: 'bg-violet-50 text-violet-700 border-violet-100',
    other: 'bg-slate-50 text-slate-600 border-slate-200',
  };

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

  const [eventSearch, setEventSearch] = useState('');

  const dbSpotlight = weekSubmissions.find(s => s.type === 'spotlight') ?? null;
  const dbFeatured = weekSubmissions.filter(s => s.type === 'featured');

  const searchQ = eventSearch.trim().toLowerCase();
  function matchesSearch(fields: (string | undefined | null)[]): boolean {
    if (!searchQ) return true;
    const combined = fields.filter(Boolean).join(' ').toLowerCase();
    return searchQ.split(/\s+/).every(word => combined.includes(word));
  }
  const filteredSpotlight = dbSpotlight && matchesSearch([dbSpotlight.title, dbSpotlight.description, dbSpotlight.location, dbSpotlight.town, ...(dbSpotlight.tags ?? [])]) ? dbSpotlight : null;
  const filteredFeatured = dbFeatured.filter((s: SpotlightBooking) => matchesSearch([s.title, s.description, s.location, s.town, ...(s.tags ?? [])]));
  const filteredEvents = events.filter((ev: CommunityEvent) => matchesSearch([ev.title, ev.description, ev.location, ev.town]));

  return (
    <div className="space-y-10 pb-6 -mt-6 md:mt-0">

      {/* Header + Search */}
      <div className="pt-2 pb-1 md:pt-4 md:pb-2 space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Around Town</h1>
          <p className="text-slate-500 text-sm">Local events, yard sales, announcements, and community updates.</p>
        </div>
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
          <input
            type="text"
            value={eventSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
          />
          {eventSearch && (
            <button
              type="button"
              onClick={() => setEventSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>
      </div>

      {/* Current Spotlights */}
      <div id="spotlight">
        <h2 className="text-xl font-bold text-orange-500 leading-tight flex items-center gap-2 mb-1">
          <i className="fas fa-star"></i> Weekly Spotlight
        </h2>
        <p className="text-slate-500 text-sm mb-3">Promote an event, business, or announcement.</p>
        <div className="grid gap-4">

          {filteredSpotlight ? (
            /* ── DB-driven spotlight ── */
            <div
              id={`booking-${filteredSpotlight.id}`}
              className={`rounded-3xl border-2 border-amber-400 overflow-hidden shadow-xl flex flex-col bg-gradient-to-br from-amber-50 to-orange-50/60 ${filteredSpotlight.flyerUrl ? 'cursor-pointer' : ''}`}
              onClick={() => filteredSpotlight.flyerUrl && setDbFlyerUrl(filteredSpotlight.flyerUrl)}
            >
              {filteredSpotlight.imageUrl && (
                <button
                  onClick={() => filteredSpotlight.flyerUrl && setDbFlyerUrl(filteredSpotlight.flyerUrl)}
                  className={`w-full block transition-opacity focus:outline-none ${filteredSpotlight.flyerUrl ? 'hover:opacity-95 cursor-pointer' : 'cursor-default'}`}
                  aria-label={filteredSpotlight.flyerUrl ? 'View full flyer' : undefined}
                >
                  <img
                    src={filteredSpotlight.imageUrl}
                    alt={filteredSpotlight.title}
                    loading="lazy"
                    className="w-full max-h-[260px] object-cover object-top"
                  />
                </button>
              )}
              <div className="p-7 flex flex-col gap-3">
                {filteredSpotlight.eventDate && (
                  <span className="text-slate-400 text-xs font-medium">{formatEventDate(filteredSpotlight.eventDate)}</span>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{filteredSpotlight.title}</h3>
                  {filteredSpotlight.location && (
                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                      <i className="fas fa-map-marker-alt text-orange-400"></i> {filteredSpotlight.location}
                      {filteredSpotlight.town && <span className="text-slate-300 mx-1">·</span>}
                      {filteredSpotlight.town}
                    </p>
                  )}
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{filteredSpotlight.description}</p>
                {(filteredSpotlight.eventTime || (filteredSpotlight.tags && filteredSpotlight.tags.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {filteredSpotlight.eventTime && (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <i className="fas fa-clock text-amber-400"></i> {filteredSpotlight.eventTime}
                        </div>
                        {filteredSpotlight.tags && filteredSpotlight.tags.length > 0 && <span className="text-slate-200">·</span>}
                      </>
                    )}
                    {filteredSpotlight.tags?.map((tag: string) => (
                      <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagColor(tag)}`}>{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {filteredSpotlight.flyerUrl && (
                    <button
                      onClick={() => setDbFlyerUrl(filteredSpotlight.flyerUrl!)}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <i className="fas fa-file-image text-[10px]"></i> View Flyer
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShareBooking(filteredSpotlight.id, filteredSpotlight.title, 'spotlight'); }}
                    className="inline-flex items-center gap-1.5 text-slate-300 hover:text-blue-400 transition-colors"
                    title="Share this spotlight"
                  >
                    <i className={`fas ${copiedBookingId === filteredSpotlight.id ? 'fa-check text-emerald-500' : 'fa-share-from-square'} text-sm`}></i>
                    {copiedBookingId === filteredSpotlight.id && <span className="text-[10px] font-semibold text-emerald-500">Copied!</span>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
              <i className="fas fa-star text-3xl mb-3 block text-slate-200"></i>
              <p className="font-semibold text-slate-500 text-sm">No spotlight yet this week</p>
              <p className="text-xs mt-1">Be the first — <Link to="/book/spotlight" className="text-orange-500 hover:underline font-medium">book a spotlight</Link></p>
            </div>
          )}

        </div>
      </div>

      {/* Featured Listings */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 px-1 -mt-4">Featured Listings</h2>
        <p className="text-slate-400 text-xs mb-4 px-1">Posts with extra visibility this week.</p>
        <div className="grid md:grid-cols-2 gap-4">

          {filteredFeatured.length > 0 ? (
            /* ── DB-driven featured cards ── */
            filteredFeatured.map((sub: SpotlightBooking) => (
              <div
                key={sub.id}
                id={`booking-${sub.id}`}
                className={`bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm ${sub.flyerUrl ? 'cursor-pointer' : ''}`}
                onClick={() => sub.flyerUrl && setDbFlyerUrl(sub.flyerUrl!)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">Featured Listing</span>
                    {sub.eventDate && <span className="text-slate-400 text-xs">{formatEventDate(sub.eventDate)}</span>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShareBooking(sub.id, sub.title, 'featured'); }}
                    className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1"
                    title="Share this listing"
                  >
                    <i className={`fas ${copiedBookingId === sub.id ? 'fa-check text-emerald-500' : 'fa-share-from-square'} text-sm`}></i>
                    {copiedBookingId === sub.id && <span className="text-[10px] font-semibold text-emerald-500">Copied!</span>}
                  </button>
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
                {(sub.eventTime || (sub.tags && sub.tags.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sub.eventTime && (
                      <>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <i className="fas fa-clock text-amber-400 text-[10px]"></i> {sub.eventTime}
                        </div>
                        {sub.tags && sub.tags.length > 0 && <span className="text-slate-200">·</span>}
                      </>
                    )}
                    {sub.tags?.map((tag: string) => (
                      <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagColor(tag)}`}>{tag}</span>
                    ))}
                  </div>
                )}
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
            <div className="col-span-2 bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 shadow-sm">
              <i className="fas fa-bullhorn text-2xl mb-3 block text-slate-200"></i>
              <p className="font-semibold text-slate-500 text-sm">No featured listings yet this week</p>
              <p className="text-xs mt-1">Be the first — <Link to="/book/featured" className="text-orange-500 hover:underline font-medium">get featured</Link></p>
            </div>
          )}

        </div>
      </div>

      {/* ── Community Events ── */}
      <div>
        <div className="flex items-center justify-between mb-1 px-1">
          <h2 className="text-xl font-bold text-slate-900">Events & Announcements</h2>
          {user ? (
            <button
              onClick={() => { setShowForm(true); setSubmitted(false); }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-1.5 rounded-xl shadow-sm transition-colors whitespace-nowrap"
            >
              <i className="fas fa-plus text-[10px]"></i> Post
            </button>
          ) : (
            <Link
              to="/login?signup=true"
              state={{ from: location.pathname }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-1.5 rounded-xl shadow-sm transition-colors whitespace-nowrap"
            >
              <i className="fas fa-plus text-[10px]"></i> Post
            </Link>
          )}
        </div>
        <p className="text-slate-400 text-xs mb-3 px-1">Free · Share events, yard sales, announcements, and local news. For questions, use <Link to="/ask" className="underline hover:text-slate-600">Ask the Community</Link>.</p>

        {submitted && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
            <i className="fas fa-check-circle"></i>
            Your post is live!
          </div>
        )}

        {loadingEvents ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-sm shadow-sm">
            <i className="fas fa-calendar-plus text-2xl mb-3 block text-slate-200"></i>
            {searchQ ? 'No posts match your search.' : <><div>No posts on the community board yet.</div><div className="mt-1">Be the first to post →</div></>}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredEvents.map((ev: CommunityEvent) => (
              <div key={ev.id} id={`event-${ev.id}`} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-2 min-w-0 overflow-hidden transition-all">
                {/* Top row: badge + date + share + flag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${POST_TYPE_COLORS[ev.postType ?? 'event']}`}>
                      {POST_TYPE_LABELS[ev.postType ?? 'event']}
                    </span>
                    {ev.eventDate && <span className="text-slate-400 text-xs truncate">{formatEventDate(ev.eventDate)}</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleShareEvent(ev)}
                      className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1"
                      title="Share this post"
                    >
                      <i className={`fas ${copiedEventId === ev.id ? 'fa-check text-emerald-500' : 'fa-share-from-square'} text-sm`}></i>
                      {copiedEventId === ev.id && <span className="text-[10px] font-semibold text-emerald-500">Copied!</span>}
                    </button>
                    {user && user.id !== ev.userId && !isAdmin && (
                      flaggingEventId === ev.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFlagEvent(ev.id, ev.title)}
                            disabled={flagSubmitting}
                            className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {flagSubmitting ? 'Flagging...' : 'Confirm'}
                          </button>
                          <button onClick={() => setFlaggingEventId(null)} className="text-[10px] text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setFlaggingEventId(ev.id)}
                          className="text-slate-300 hover:text-orange-400 transition-colors"
                          title="Flag as inappropriate"
                        >
                          <i className="fas fa-flag text-sm"></i>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-bold text-slate-900 text-sm leading-tight break-words">{ev.title}</h3>
                <p className="text-slate-500 text-xs flex items-center gap-1 break-words">
                  <i className="fas fa-map-marker-alt text-orange-400 text-[10px] flex-shrink-0"></i> {ev.location}
                  {ev.town && <span className="text-slate-300 mx-1">·</span>}
                  {ev.town}
                </p>
                <p className="text-slate-500 text-xs leading-relaxed break-words">{ev.description}</p>

                {/* Bottom row: posted by + delete */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-slate-400">Posted by {ev.userName}</p>
                  {isAdmin ? (
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Delete (admin)"
                    >
                      <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                  ) : user?.id === ev.userId ? (
                    <button
                      onClick={() => handleDeleteOwnEvent(ev.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Remove your post"
                    >
                      <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing tiers */}
      <hr className="border-slate-200 mt-8 mb-6" />
      <div id="pricing" className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <h2 className="text-xl font-bold text-slate-900 mb-1 px-1">Promote Your Post</h2>
        <p className="text-slate-500 text-sm mb-4 px-1">Promote an event, business, or announcement for extra visibility this week.</p>
        <div className="space-y-4">

          {/* Local Spotlight — full width */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-3xl p-8 space-y-3 shadow-md">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm">
              <i className="fas fa-star text-amber-500 text-xl"></i>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Weekly Spotlight</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              The most visible placement on Townly.<br />Your post appears prominently on the Home and Events pages.
            </p>
            <div className="pt-1">
              <span className="text-3xl font-bold text-amber-600">$25</span>
              <span className="text-slate-400 text-sm font-medium"> / week</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Priority placement on the Home and Events pages</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Highlighted with an amber spotlight card to stand out</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Large spotlight banner for your event or announcement</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Clickable flyer or event image</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Pinned for the full week</li>
              <li className="flex items-center gap-2 font-semibold text-amber-700"><i className="fas fa-lock text-amber-500 text-xs"></i> Only 1 spotlight available each week</li>
            </ul>
            <p className="text-xs text-amber-700/80 font-medium">Perfect for grand openings, sales, local events, and time-sensitive announcements.</p>
            <Link
              to={user ? '/book/spotlight' : '/login?signup=true'}
              state={user ? undefined : { from: location.pathname }}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors text-sm"
            >
              <i className="fas fa-star"></i>
              {user ? 'Book a Weekly Spotlight' : 'Sign In to Book'}
            </Link>
          </div>

          {/* Featured Post */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-bullhorn text-slate-400 text-base"></i>
            </div>
            <h2 className="text-base font-bold text-slate-800">Featured Post</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Promote your event, business, sale, or announcement this week.
            </p>
            <div className="pt-0.5">
              <span className="text-xl font-bold text-slate-700">$5</span>
              <span className="text-slate-400 text-xs font-medium"> / week</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Shown above regular community posts</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Upload an image <em className="text-slate-400">(free posts are text-only)</em></li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Active for the full week</li>
              <li className="flex items-center gap-2 font-semibold text-slate-600 text-sm"><i className="fas fa-lock text-slate-400 text-xs"></i> Only 5 featured posts available each week</li>
            </ul>
            <p className="text-xs text-slate-400 font-medium">Perfect for yard sales, fundraisers, local events, and community announcements.</p>
            <Link
              to={user ? '/book/featured' : '/login?signup=true'}
              state={user ? undefined : { from: location.pathname }}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
            >
              <i className="fas fa-bullhorn text-[10px]"></i>
              {user ? 'Get Featured This Week' : 'Sign In to Book'}
            </Link>
          </div>

        </div>

        {/* Content Policy Disclaimer */}
        <p className="text-xs text-slate-400 mt-3 mb-1 px-1">
          By submitting a paid post you agree that content violating community standards — including misleading, obscene, or fraudulent posts — may be removed by the admin without refund.
        </p>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-trash text-red-500"></i>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Delete this post?</p>
                <p className="text-slate-500 text-xs mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-20 sm:pb-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[80vh] sm:max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Post to Events & Announcements</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs px-3 py-2.5 rounded-xl leading-relaxed space-y-0.5">
              <p>No buying, selling, or business ads • no gossip</p>
              <p>Businesses can promote with a <Link to={user ? '/book/featured' : '/login?signup=true'} className="font-semibold underline" onClick={() => setShowForm(false)}>Featured Post</Link> or <Link to={user ? '/book/spotlight' : '/login?signup=true'} className="font-semibold underline" onClick={() => setShowForm(false)}>Spotlight</Link>.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What kind of post is this?</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(POST_TYPE_LABELS) as [CommunityPostType, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEPostType(value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${ePostType === value ? POST_TYPE_COLORS[value] + ' shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Post Title</label>
                <input
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Yard Sale, Church Dinner, Town Meeting"
                  value={eTitle}
                  onChange={e => setETitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Date</label>
                    <button
                      type="button"
                      onClick={() => setEDate(new Date().toISOString().split('T')[0])}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide"
                    >
                      Today
                    </button>
                  </div>
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location</label>
                <input
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Courthouse Square, City Park, Main St"
                  value={eLocation}
                  onChange={e => setELocation(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <span className={`text-xs ${eDesc.length > 280 ? 'text-red-400' : 'text-slate-300'}`}>{eDesc.length}/300</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={300}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="What's happening? Share details the community should know or attend."
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
                {submitting ? 'Posting...' : 'Post to Board'}
              </button>
              <p className="text-center text-[11px] text-slate-300">Posts appear instantly and may be shared by neighbors.</p>
            </form>
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
