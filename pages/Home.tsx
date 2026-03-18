
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconHome, IconCar, IconScissors, IconStethoscope, IconToolsKitchen2, IconBuildingChurch } from '@tabler/icons-react';
import { LostFoundPost, CommunityAlert, SpotlightBooking, Provider, RecommendationRequest, CommunityEvent } from '../types';
import { fetchCurrentWeekSubmissions, prefetchHomeImages, onHomeImagesReady, fetchProviders, fetchRequests, fetchApprovedCommunityEvents } from '../lib/api';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface HomeProps {
  lostFound: LostFoundPost[];
  communityAlerts: CommunityAlert[];
  nwsAlerts: { id: string; event: string; headline: string; severity: string; senderName: string; expires: string | null }[];
}



const ALERT_ICON_COLORS: Record<string, string> = {
  'fa-triangle-exclamation': 'text-amber-500',
  'fa-bell':                 'text-red-700',
  'fa-bullhorn':             'text-blue-500',
  'fa-cloud-bolt':           'text-indigo-500',
  'fa-droplet':              'text-cyan-500',
  'fa-fire':                 'text-orange-500',
  'fa-road-barrier':         'text-yellow-600',
  'fa-house-flood-water':    'text-teal-500',
};

const Home: React.FC<HomeProps> = ({ lostFound, communityAlerts, nwsAlerts }) => {
  const [alertIndex, setAlertIndex] = useState(0);
  const [alertVisible, setAlertVisible] = useState(true);
  const [search, setSearch] = useState('');
  const [imagesReady, setImagesReady] = useState(false);
  const [currentSpotlight, setCurrentSpotlight] = useState<SpotlightBooking | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    prefetchHomeImages();
    onHomeImagesReady(() => setImagesReady(true));
  }, []);

  useEffect(() => {
    fetchCurrentWeekSubmissions()
      .then(subs => setCurrentSpotlight(subs.find(s => s.type === 'spotlight') ?? null))
      .catch(console.error);
  }, []);


  // Unified alert pool: NWS first, then community alerts
  const allAlerts = [
    ...nwsAlerts.map(a => ({
      id: a.id,
      title: a.event,
      description: a.headline,
      icon: 'fa-cloud-bolt',
      isNws: true,
      severity: a.severity,
      expires: a.expires,
      senderName: a.senderName,
    })),
    ...communityAlerts.map(a => ({ ...a, isNws: false, severity: null, expires: null, senderName: null })),
  ];

  // Reset index when pool size changes to avoid out-of-bounds
  useEffect(() => {
    setAlertIndex(0);
  }, [allAlerts.length]);

  useEffect(() => {
    if (allAlerts.length <= 1) return;
    const timer = setInterval(() => {
      setAlertVisible(false);
      setTimeout(() => {
        setAlertIndex(i => (i + 1) % allAlerts.length);
        setAlertVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, [allAlerts.length]);

  const safeIndex = allAlerts.length > 0 ? alertIndex % allAlerts.length : 0;
  const activeAlert = allAlerts[safeIndex] ?? null;

  const categories = [
    { name: 'Home Services', label: 'Home Services', icon: IconHome, color: 'bg-blue-100 text-blue-600' },
    { name: 'Personal Care', label: 'Personal Care', icon: IconScissors, color: 'bg-pink-100 text-pink-600' },
    { name: 'Automotive', label: 'Automotive', icon: IconCar, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Health & Medical', label: 'Health & Medical', icon: IconStethoscope, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Food & Drink', label: 'Food & Drink', icon: IconToolsKitchen2, color: 'bg-red-100 text-red-600' },
    { name: 'Churches', label: 'Churches', icon: IconBuildingChurch, color: 'bg-violet-100 text-violet-600' },
  ];

  // Unified search data
  const [providers, setProviders] = useState<Provider[]>([]);
  const [questions, setQuestions] = useState<RecommendationRequest[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProviders().then(setProviders).catch(() => {});
    fetchRequests().then(setQuestions).catch(() => {});
    fetchApprovedCommunityEvents().then(setEvents).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return null;
    const words = q.split(/\s+/);
    const match = (text: string) => { const t = text.toLowerCase(); return words.every(w => t.includes(w)); };

    const biz = providers
      .filter(p => p.status === 'approved' && match([p.name, p.subcategory || '', p.category, p.description || '', p.town, ...(p.tags || [])].join(' ')))
      .slice(0, 5)
      .map(p => ({ id: p.id, title: p.name, subtitle: `${p.subcategory || p.category} · ${p.town}`, link: `/provider/${p.id}`, kind: 'Business' as const }));

    const qs = questions
      .filter(r => match([r.serviceNeeded, r.description || '', r.town].join(' ')))
      .slice(0, 4)
      .map(r => ({ id: r.id, title: r.serviceNeeded, subtitle: `${r.town} · ${r.status === 'open' ? 'Open' : 'Answered'}`, link: r.slug ? `/ask/${r.slug}` : '/ask', kind: 'Question' as const }));

    const lf = lostFound
      .filter(p => match([p.title, p.description || '', p.town].join(' ')))
      .slice(0, 4)
      .map(p => ({ id: p.id, title: p.title, subtitle: `${p.town} · ${p.type.startsWith('lost') ? 'Lost' : 'Found'}`, link: '/lost-found', kind: 'Lost & Found' as const }));

    const ev = events
      .filter(e => match([e.title, e.description || '', e.location || '', e.town].join(' ')))
      .slice(0, 4)
      .map(e => ({ id: e.id, title: e.title, subtitle: `${e.town} · ${e.eventDate ? new Date(e.eventDate).toLocaleDateString() : ''}`, link: '/events', kind: 'Event' as const }));

    const all = [...biz, ...qs, ...lf, ...ev];
    return all.length > 0 ? all : null;
  }, [search, providers, questions, lostFound, events]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const showDropdown = !isMobile && searchFocused && search.trim().length >= 2;

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearchFocused(false);
    navigate(`/search?q=${encodeURIComponent(search)}`);
  }, [search, navigate]);

  const sortedPosts = [...lostFound].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestLF = sortedPosts[0];

  if (!imagesReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <i className="fas fa-spinner fa-spin text-3xl text-orange-500"></i>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-4">

      {/* Hero Section */}
      <section
        className="text-center relative overflow-visible rounded-3xl text-white px-4 py-8 md:px-16 md:py-16"
      >
        {/* Background image + dark overlay — clipped to rounded shape */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
          style={{ backgroundImage: "url('/images/lakebackground.webp')", backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(10, 25, 50, 0.85), rgba(10, 25, 50, 0.60))' }}
          />
        </div>

        {/* Content — mobile: stacked (logo top, content below) | desktop: centered column */}
        <div className="relative z-10 flex flex-col items-center mx-auto w-full md:max-w-7xl">

          {/* Logo */}
          <div className="max-w-[187px] mx-auto mb-4 md:max-w-[220px] md:mb-5">
            <img src="/images/townly.webp" alt={tenant.displayName} className="w-full h-auto drop-shadow-2xl" />
          </div>

          {/* Text + actions */}
          <div className="flex flex-col items-center w-full md:max-w-3xl">
            <h1 className="text-xl md:text-5xl font-bold text-white leading-tight mb-2 md:mb-3">
              What's happening in your town?
            </h1>
            <p className="text-white/75 text-sm md:text-lg font-medium leading-relaxed mb-6">
              Find local events, businesses, and community updates in Grayson County KY
            </p>

            {/* CTA Buttons — hidden on mobile */}
            <div className="hidden md:flex flex-row justify-center gap-3 mb-5">
              <Link
                to="/events"
                className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow transition-all hover:scale-105 active:scale-95"
              >
                Browse Events
              </Link>
              <Link
                to="/directory"
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white/85 px-6 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-105 active:scale-95"
              >
                Find Local Businesses
              </Link>
            </div>

            {/* Search Bar */}
            <div ref={searchRef} className="w-full relative mt-3 md:mt-0 md:max-w-2xl">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  name="search"
                  autoComplete="off"
                  placeholder="Search Grayson County..."
                  className="md:hidden w-full h-11 pl-10 pr-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl focus:bg-white/20 focus:border-orange-400/60 focus:shadow-[0_0_0_2px_rgba(255,106,0,0.20)] text-white outline-none transition-all placeholder:text-white/50 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                />
                <input
                  type="text"
                  name="search"
                  autoComplete="off"
                  placeholder="Search businesses, events, questions..."
                  className="hidden md:block w-full h-11 pl-10 pr-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl focus:bg-white/20 focus:border-orange-400/60 focus:shadow-[0_0_0_2px_rgba(255,106,0,0.20)] text-white outline-none transition-all placeholder:text-white/50 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                />
                <i className="fas fa-search absolute left-3 top-[22px] -translate-y-1/2 text-white/50 text-sm"></i>
                <button type="submit" className="absolute right-2 top-[22px] -translate-y-1/2 bg-orange-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-lg hover:bg-orange-500 transition-colors">
                  Search
                </button>
              </form>

              {/* Live search dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                  {searchResults ? (
                    <>
                      {searchResults.map((r, i) => {
                        const kindIcon = r.kind === 'Business' ? 'fa-store' : r.kind === 'Question' ? 'fa-comments' : r.kind === 'Event' ? 'fa-calendar-alt' : 'fa-paw';
                        const kindColor = r.kind === 'Business' ? 'text-blue-500' : r.kind === 'Question' ? 'text-violet-500' : r.kind === 'Event' ? 'text-orange-500' : 'text-amber-600';
                        const prevKind = i > 0 ? searchResults[i - 1].kind : null;
                        return (
                          <React.Fragment key={`${r.kind}-${r.id}`}>
                            {r.kind !== prevKind && (
                              <div className="px-3 pt-2.5 pb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{r.kind === 'Business' ? 'Businesses' : r.kind === 'Question' ? 'Questions' : r.kind === 'Event' ? 'Events' : 'Lost & Found'}</span>
                              </div>
                            )}
                            <Link
                              to={r.link}
                              onClick={() => { setSearchFocused(false); setSearch(''); }}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                              <i className={`fas ${kindIcon} text-sm ${kindColor} w-5 text-center flex-shrink-0`}></i>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                                <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>
                              </div>
                              <i className="fas fa-chevron-right text-slate-300 text-[10px] flex-shrink-0"></i>
                            </Link>
                          </React.Fragment>
                        );
                      })}
                      <div className="border-t border-slate-100 px-3 py-2.5">
                        <button onClick={handleSearch} className="text-xs font-semibold text-orange-600 hover:text-orange-700 w-full text-left">
                          See all results for "{search}" <i className="fas fa-arrow-right text-[10px] ml-1"></i>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-slate-400">No results for "{search}"</p>
                      <button onClick={handleSearch} className="text-xs font-semibold text-orange-600 hover:text-orange-700 mt-2 inline-block">
                        See all results <i className="fas fa-arrow-right text-[10px] ml-1"></i>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Community Highlights */}
      <section>
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <h2 className="text-base font-semibold text-slate-900">Upcoming</h2>
          </div>
          <Link to="/events" className="text-amber-700 font-semibold text-xs whitespace-nowrap hover:text-amber-900 hover:underline flex-shrink-0 flex items-center gap-1">See all events <i className="fas fa-arrow-right text-[9px]"></i></Link>
        </div>
        <p className="text-slate-400 text-xs px-1 mb-2">Events and announcements in {tenant.name}.</p>

        <div className="space-y-3">

          {/* Spotlight Card — accent bar style */}
          {currentSpotlight ? (
            <Link to="/events" className="block bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 border border-slate-100 border-l-4 border-l-amber-400 flex flex-col md:flex-row md:items-center md:gap-6 px-6 py-[18px]">
              {(currentSpotlight.thumbnailUrl || currentSpotlight.imageUrl) && (
                <div className="hidden md:block flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-100">
                  <img
                    src={currentSpotlight.thumbnailUrl || currentSpotlight.imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 15%' }}
                  />
                </div>
              )}
              <div className="flex flex-col flex-1 gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-amber-100 text-amber-700">⭐ Weekly Spotlight</span>
                </div>
                {currentSpotlight.eventDate && (
                  <span className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                    <i className="fas fa-calendar text-amber-500 text-[10px]"></i>
                    {new Date(currentSpotlight.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                <h3 className="font-bold text-slate-900 text-xl leading-tight">{currentSpotlight.title}</h3>
                {currentSpotlight.location && (
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> {currentSpotlight.location}
                  </p>
                )}
                <p className="text-slate-600 text-sm leading-relaxed mt-1 line-clamp-2">{currentSpotlight.teaser ?? currentSpotlight.description}</p>
              </div>
              <div className="mt-4 md:mt-0 md:flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-sm whitespace-nowrap">
                  View Details <i className="fas fa-arrow-right text-[10px]"></i>
                </span>
              </div>
            </Link>
          ) : (
            <Link to="/events" state={{ scrollTo: 'pricing' }} className="block bg-white rounded-2xl border border-dashed border-amber-200 px-6 py-5 text-center hover:border-amber-400 transition-colors">
              <i className="fas fa-star text-amber-300 text-2xl mb-2 block"></i>
              <p className="font-semibold text-slate-500 text-sm">No spotlight this week yet</p>
              <p className="text-xs text-slate-400 mt-1">Be the first — <span className="text-orange-500 font-medium">book a spotlight</span></p>
            </Link>
          )}

          {/* Second row: community cards */}
          <div className="grid md:grid-cols-2 gap-3">

            {/* Community Alert Card */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              {allAlerts.length > 0 ? (
                <div style={{ display: 'grid' }}>
                  {/* All alerts share the same grid cell — height locks to the tallest */}
                  {allAlerts.map((alert, i) => {
                    const isActive = i === safeIndex;
                    const isSevereNws = alert.isNws && (alert.severity === 'Extreme' || alert.severity === 'Severe');
                    return (
                      <div
                        key={alert.id}
                        style={{ gridArea: '1/1', opacity: isActive ? (alertVisible ? 1 : 0) : 0, transition: 'opacity 0.4s ease', visibility: isActive ? 'visible' : 'hidden', pointerEvents: isActive ? 'auto' : 'none' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 ${isSevereNws ? 'bg-red-200 text-red-700' : alert.isNws ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            <i className={`fas ${alert.icon} text-xs ${ALERT_ICON_COLORS[alert.icon] ?? 'text-red-700'}`}></i>
                            {alert.isNws ? `${alert.severity} · NWS` : alert.title}
                          </span>
                          {allAlerts.length > 1 && isActive && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-200 text-red-700 flex-shrink-0">
                              {safeIndex + 1}/{allAlerts.length}
                            </span>
                          )}
                        </div>
                        {alert.isNws && <p className="text-slate-700 text-xs font-semibold leading-snug mb-1">{alert.title}</p>}
                        <p className="text-slate-600 text-xs leading-relaxed">{alert.description}</p>
                        {alert.isNws && alert.expires && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {alert.senderName} · Expires {new Date(alert.expires).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-red-100 text-red-700 inline-block mb-2">
                    🚨 Community Alert
                  </span>
                  <p className="text-slate-500 text-xs leading-relaxed flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                    No alerts reported in {tenant.name} today.
                  </p>
                </>
              )}
            </div>

            {/* Lost & Found Card */}
            <Link to="/lost-found" className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {latestLF ? (
                <>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest self-start mb-2 ${
                    latestLF.type.includes('lost') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {latestLF.type.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1">{latestLF.title}</h3>
                  <p className="text-slate-500 text-xs flex items-center">
                    <i className="fas fa-map-marker-alt mr-1 text-orange-400"></i>
                    {latestLF.locationDescription}
                  </p>
                  <span className="mt-auto pt-3 inline-flex items-center text-orange-600 text-xs font-bold">
                    View board <i className="fas fa-arrow-right ml-1 text-[10px]"></i>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500 self-start mb-2">
                    Lost &amp; Found
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">
                    No lost or found items reported today.
                  </p>
                  <span className="mt-auto pt-3 inline-flex items-center text-orange-600 text-xs font-bold">
                    View board <i className="fas fa-arrow-right ml-1 text-[10px]"></i>
                  </span>
                </>
              )}
            </Link>

          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-base font-bold text-slate-900">Popular Categories</h2>
          <Link to="/directory" className="text-orange-600 font-bold text-sm hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/directory?cat=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center p-4 md:p-6 bg-white border border-slate-100 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-lg hover:border-orange-100 hover:-translate-y-1 transition-all duration-200 text-center"
            >
              <div className={`${cat.color} bg-opacity-60 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-2 md:mb-3 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200`}>
                {(() => { const Icon = cat.icon; return <Icon className="w-7 h-7 md:w-8 md:h-8" stroke={1.5} />; })()}
              </div>
              <span className="font-semibold text-slate-700 text-xs md:text-sm leading-tight">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Community CTA */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50/70 rounded-[2.5rem] px-6 py-3 md:px-10 md:py-14 relative overflow-hidden border border-blue-100">
        <div className="hidden md:block absolute md:top-1/2 md:right-20 md:-translate-y-1/2 pointer-events-none md:opacity-[0.07] text-blue-400">
          <i className="fas fa-comment md:text-[250px] leading-none"></i>
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-xl md:text-3xl font-bold text-slate-900 mb-3 md:mb-4">Your Voice Helps This Community</h2>
          <p className="text-slate-500 mb-5 md:mb-8 text-sm md:text-base leading-[1.6]">
            Know a business worth listing? Add them to the directory.<br />
            Looking for a local business? Ask the community.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-3">
            <Link to="/add-provider" className="w-full md:w-auto text-center bg-blue-800 text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold shadow-sm hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
              Add a Local Business
            </Link>
            <Link to="/ask" className="w-full md:w-auto text-center bg-white text-slate-700 border border-slate-300 px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-100 transition-all hover:scale-105 active:scale-95">
              Ask the Community
            </Link>
          </div>
        </div>
      </section>

    {/* Contact / bug report */}
    <p className="text-center text-xs text-slate-400 pb-1 pt-8">
      Found a bug or have feedback? Email <a href="mailto:contact@townly.us" className="text-orange-500 hover:underline font-medium">contact@townly.us</a>
    </p>

    </div>
  );
};

export default Home;
