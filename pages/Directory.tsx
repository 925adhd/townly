
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { Provider, Category, Town } from '../types';
import CustomSelect from '../components/CustomSelect';
import { submitReport } from '../lib/api';
import { getCurrentTenant } from '../tenants';
import { IconHome, IconCar, IconScissors, IconStethoscope, IconToolsKitchen2, IconBuildingChurch, IconBriefcase, IconKey, IconBuildingStore, IconShoppingBag, IconSchool, IconBuildingBank, IconCalendarEvent, IconTrees } from '@tabler/icons-react';

const tenant = getCurrentTenant();

const categoryIcon: Record<string, React.ElementType> = {
  'Home Services':              IconHome,
  'Automotive':                 IconCar,
  'Personal Care':              IconScissors,
  'Health & Medical':           IconStethoscope,
  'Professional Services':      IconBriefcase,
  'Housing & Rentals':          IconKey,
  'Food & Drink':               IconToolsKitchen2,
  'Shopping':                   IconShoppingBag,
  'Churches':                   IconBuildingChurch,
  'Schools & Education':        IconSchool,
  'Government & Public Services': IconBuildingBank,
  'Events & Community':         IconCalendarEvent,
  'Parks & Recreation':         IconTrees,
  'Other':                      IconBuildingStore,
};

const categoryIconColor: Record<string, string> = {
  'Home Services':              'text-blue-600',
  'Automotive':                 'text-indigo-600',
  'Personal Care':              'text-pink-600',
  'Health & Medical':           'text-emerald-600',
  'Professional Services':      'text-amber-600',
  'Housing & Rentals':          'text-purple-600',
  'Food & Drink':               'text-red-600',
  'Shopping':                   'text-orange-600',
  'Churches':                   'text-violet-600',
  'Schools & Education':        'text-cyan-600',
  'Government & Public Services': 'text-slate-600',
  'Events & Community':         'text-rose-600',
  'Parks & Recreation':         'text-green-600',
  'Other':                      'text-slate-500',
};

function providerImage(p: Provider): string | null {
  if (p.image) return p.image;
  return null;
}

interface DirectoryProps {
  providers: Provider[];
  user?: { id: string; name: string; role?: string } | null;
}

const SCROLL_KEY = 'directory_scroll';

function levenshtein(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[b.length];
}

const STOP_WORDS = new Set([
  'install', 'installed', 'fix', 'fixed', 'repair', 'repairs', 'repaired',
  'find', 'get', 'need', 'want', 'help', 'hire', 'looking', 'for', 'a', 'an',
  'the', 'near', 'me', 'my', 'local', 'best', 'good', 'cheap', 'affordable',
  'services', 'service', 'professional', 'pros', 'provider', 'change', 'changes',
]);

// Maps common search terms to the category they imply
const KEYWORD_CATEGORY: Record<string, string> = {
  // Auto
  'oil': 'Automotive', 'tire': 'Automotive', 'tires': 'Automotive', 'brake': 'Automotive', 'brakes': 'Automotive',
  'transmission': 'Automotive', 'exhaust': 'Automotive', 'mechanic': 'Automotive', 'alignment': 'Automotive',
  'windshield': 'Automotive', 'detailing': 'Automotive', 'inspection': 'Automotive',
  'battery': 'Automotive', 'radiator': 'Automotive', 'alternator': 'Automotive', 'coolant': 'Automotive',
  'filter': 'Automotive', 'spark': 'Automotive', 'muffler': 'Automotive', 'axle': 'Automotive', 'clutch': 'Automotive',
  // Home Services
  'plumber': 'Home Services', 'plumbing': 'Home Services',
  'electrician': 'Home Services', 'electrical': 'Home Services', 'electric': 'Home Services', 'wiring': 'Home Services',
  'hvac': 'Home Services', 'heating': 'Home Services', 'cooling': 'Home Services', 'ac': 'Home Services',
  'roofing': 'Home Services', 'roofer': 'Home Services', 'roof': 'Home Services',
  'painting': 'Home Services', 'painter': 'Home Services',
  'landscaping': 'Home Services', 'landscaper': 'Home Services', 'lawn': 'Home Services', 'mowing': 'Home Services',
  'toilet': 'Home Services', 'sink': 'Home Services', 'drain': 'Home Services', 'faucet': 'Home Services',
  'pipe': 'Home Services', 'pipes': 'Home Services', 'leak': 'Home Services', 'leaking': 'Home Services',
  'clog': 'Home Services', 'clogged': 'Home Services', 'sewer': 'Home Services', 'water': 'Home Services',
  'pest': 'Home Services', 'cleaning': 'Home Services', 'gutters': 'Home Services', 'fence': 'Home Services',
  'carpentry': 'Home Services', 'carpenter': 'Home Services', 'flooring': 'Home Services',
  'light': 'Home Services', 'lights': 'Home Services', 'lighting': 'Home Services',
  'drywall': 'Home Services', 'insulation': 'Home Services', 'pressure': 'Home Services',
  'window': 'Home Services', 'windows': 'Home Services', 'door': 'Home Services', 'doors': 'Home Services',
  'deck': 'Home Services', 'concrete': 'Home Services', 'foundation': 'Home Services',
  'tree': 'Home Services', 'trees': 'Home Services', 'irrigation': 'Home Services',
  'junk': 'Home Services', 'moving': 'Home Services', 'handyman': 'Home Services',
  // Personal Care
  'haircut': 'Personal Care', 'hair': 'Personal Care', 'barber': 'Personal Care', 'salon': 'Personal Care',
  'nails': 'Personal Care', 'manicure': 'Personal Care', 'pedicure': 'Personal Care',
  'massage': 'Personal Care', 'spa': 'Personal Care', 'waxing': 'Personal Care',
  // Healthcare
  'doctor': 'Health & Medical', 'dentist': 'Health & Medical', 'dental': 'Health & Medical', 'clinic': 'Health & Medical',
  'therapy': 'Health & Medical', 'therapist': 'Health & Medical', 'chiropractor': 'Health & Medical', 'vision': 'Health & Medical',
  // Restaurants
  'restaurant': 'Food & Drink', 'food': 'Food & Drink', 'pizza': 'Food & Drink', 'burger': 'Food & Drink',
  'cafe': 'Food & Drink', 'diner': 'Food & Drink', 'takeout': 'Food & Drink', 'delivery': 'Food & Drink',
  // Rentals
  'rental': 'Housing & Rentals', 'apartment': 'Housing & Rentals', 'house': 'Housing & Rentals', 'storage': 'Housing & Rentals',
  // Churches & Faith
  'church': 'Churches', 'churches': 'Churches', 'chapel': 'Churches',
  'ministry': 'Churches', 'pastor': 'Churches', 'worship': 'Churches',
  'congregation': 'Churches', 'parish': 'Churches', 'cathedral': 'Churches',
  'baptist': 'Churches', 'methodist': 'Churches', 'catholic': 'Churches',
  'protestant': 'Churches', 'evangelical': 'Churches', 'faith': 'Churches',
};

function fuzzyMatchToken(token: string, fields: string, fieldWords: string[]): boolean {
  if (fields.includes(token)) return true;
  // Prefix match for suffix variants (e.g. "electric" → "electrical")
  const prefix = token.slice(0, Math.max(4, Math.ceil(token.length * 0.7)));
  if (fieldWords.some(w => w.startsWith(prefix))) return true;
  // Levenshtein for typos — threshold scales with word length
  if (token.length < 5) return false;
  const maxDist = token.length >= 10 ? 3 : token.length >= 7 ? 2 : 1;
  return fieldWords.some(w =>
    Math.abs(w.length - token.length) <= maxDist && levenshtein(token, w) <= maxDist
  );
}

const CAT_LABELS: Record<string, { heading: string; noun: string; addBtn: string }> = {
  'Food & Drink':                   { heading: 'Food & Drink',                    noun: 'restaurants',  addBtn: 'Add a Restaurant' },
  'Shopping':                       { heading: 'Local Shopping',                  noun: 'shops',        addBtn: 'Add a Shop' },
  'Home Services':                  { heading: 'Home Service Providers',          noun: 'providers',    addBtn: 'Add a Provider' },
  'Automotive':                     { heading: 'Automotive Services',             noun: 'shops',        addBtn: 'Add a Shop' },
  'Personal Care':                  { heading: 'Personal Care Providers',         noun: 'providers',    addBtn: 'Add a Provider' },
  'Health & Medical':               { heading: 'Health & Medical',                noun: 'providers',    addBtn: 'Add a Provider' },
  'Professional Services':          { heading: 'Professional Services',           noun: 'providers',    addBtn: 'Add a Provider' },
  'Housing & Rentals':              { heading: 'Housing & Rentals',               noun: 'businesses',   addBtn: 'Add a Business' },
  'Churches':                       { heading: 'Local Churches',                  noun: 'churches',     addBtn: 'Add a Church' },
  'Schools & Education':            { heading: 'Schools & Education',             noun: 'schools',      addBtn: 'Add a School' },
  'Government & Public Services':   { heading: 'Government & Public Services',    noun: 'listings',     addBtn: 'Add a Listing' },
  'Events & Community':             { heading: 'Events & Community',              noun: 'listings',     addBtn: 'Add a Listing' },
  'Parks & Recreation':             { heading: 'Parks & Recreation',              noun: 'parks',        addBtn: 'Add a Park' },
};

function catLabel(category: string, key: 'heading' | 'noun' | 'addBtn'): string {
  return CAT_LABELS[category]?.[key] ?? { heading: 'Local Businesses', noun: 'businesses', addBtn: 'Add a Business' }[key];
}

function hireAgainLabel(category: string): string {
  if (category === 'Food & Drink') return 'would return';
  if (category === 'Personal Care') return 'would book again';
  if (category === 'Health & Medical') return 'would return';
  if (category === 'Housing & Rentals') return 'would rent again';
  if (category === 'Automotive') return 'would use again';
  if (category === 'Churches') return 'would attend again';
  return 'would hire again';
}

const Directory: React.FC<DirectoryProps> = ({ providers, user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [localQuery, setLocalQuery] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('q') || '');
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState('');

  const handleSubmitReport = async (providerId: string, providerName: string) => {
    if (!user) return;
    setSubmittingReport(true);
    try {
      await submitReport('provider', providerId, providerName, reportReason);
      setReportingId(null);
      setReportReason('');
      setReportNotice('Report submitted. Thank you.');
      setTimeout(() => setReportNotice(''), 4000);
    } catch (err: any) {
      setReportNotice('Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // All filter state lives in the URL so back-navigation restores it
  const query    = searchParams.get('q') || '';

  // Debounce search input → only update URL (and trigger filter) after typing stops
  useEffect(() => {
    const t = setTimeout(() => updateParam('q', localQuery), 300);
    return () => clearTimeout(t);
  }, [localQuery]);

  // Sync local input if URL changes externally (e.g. browser back)
  useEffect(() => { setLocalQuery(query); }, [query]);
  const category     = (searchParams.get('cat') as Category) || 'All';
  const town         = (searchParams.get('town') as Town) || 'All';
  const sortBy       = (searchParams.get('sort') as 'rating' | 'reviews' | 'newest') || 'rating';
  const denomination = searchParams.get('denom') || 'All';

  const towns: Town[] = tenant.towns;
  const categories: Category[] = ['Food & Drink', 'Shopping', 'Home Services', 'Automotive', 'Personal Care', 'Health & Medical', 'Professional Services', 'Housing & Rentals', 'Churches', 'Schools & Education', 'Government & Public Services', 'Events & Community', 'Parks & Recreation'];

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'All' && value !== 'rating') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  // Restore scroll position when returning from a detail page
  const didRestore = useRef(false);
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    if ((location.state as any)?.scrollTop) {
      window.scrollTo(0, 0);
      return;
    }
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      sessionStorage.removeItem(SCROLL_KEY);
      requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
    }
  }, []);

  const denominations = useMemo(() => {
    const denoms = providers
      .filter(p => p.category === 'Churches' && p.subcategory)
      .map(p => p.subcategory as string);
    return ['All', ...Array.from(new Set(denoms)).sort()];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const matchCat = category === 'All' || p.category === category;
      const matchTown = town === 'All' || p.town === town;
      const matchDenom = denomination === 'All' || p.category !== 'Churches' || p.subcategory === denomination;
      const matchQuery = !query ? true : (() => {
        const allTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
        const tokens = allTokens.filter(t => !STOP_WORDS.has(t));
        if (tokens.length === 0) return true;
        const fields = [p.name, p.subcategory || '', p.category, p.town, p.description || '', ...(p.tags ?? [])].join(' ').toLowerCase();
        const fieldWords = fields.split(/\W+/).filter(Boolean);
        return tokens.every(token =>
          fuzzyMatchToken(token, fields, fieldWords) ||
          KEYWORD_CATEGORY[token] === p.category
        );
      })();
      return matchCat && matchTown && matchDenom && matchQuery;
    }).sort((a, b) => {
      // Paid placements always float above organic results
      const aFeatured = a.listingTier === 'featured' ? 1 : 0;
      const bFeatured = b.listingTier === 'featured' ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;

      // Non-featured listings are always alphabetical
      if (!aFeatured && !bFeatured) return a.name.localeCompare(b.name);

      // Featured listings sorted among themselves by the selected sort
      if (sortBy === 'rating') {
        const diff = b.averageRating - a.averageRating;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (sortBy === 'reviews') {
        const diff = b.reviewCount - a.reviewCount;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [providers, category, town, sortBy, query, denomination]);

  function handleProviderClick() {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  }

  return (
    <div className="space-y-6 pb-24">
      {reportNotice && (
        <div className={`text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between ${reportNotice.startsWith('Failed') ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
          <span>{reportNotice.startsWith('Failed') ? reportNotice : <><i className="fas fa-check-circle mr-2"></i>{reportNotice}</>}</span>
          <button onClick={() => setReportNotice('')} className="ml-4 font-bold text-lg leading-none opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{catLabel(category, 'heading')}</h1>
          <p className="text-slate-500">Found {filteredProviders.length} {catLabel(category, 'noun')} matching your criteria</p>
        </div>
        {user && (
          <div className="flex gap-2">
            <Link to="/add-provider" className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center shadow-sm hover:bg-slate-50">
              <i className="fas fa-plus mr-2 text-blue-600"></i>
              {catLabel(category, 'addBtn')}
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
        {/* Search */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Search</label>
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              name="q"
              placeholder="Search businesses or services..."
              autoComplete="off"
              value={localQuery}
              onChange={e => setLocalQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {localQuery && (
              <button
                onClick={() => { setLocalQuery(''); updateParam('q', ''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>
        </div>
        {/* Category — full width */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Category</label>
          <CustomSelect
            value={category}
            onChange={(v) => updateParam('cat', v)}
            options={[{ value: 'All', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]}
          />
        </div>
        {/* Row: Town + Sort By / Denomination */}
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Town</label>
            <CustomSelect
              value={town}
              onChange={(v) => updateParam('town', v)}
              options={[{ value: 'All', label: 'Everywhere' }, ...towns.map(t => ({ value: t, label: t }))]}
            />
          </div>
          {category === 'Churches' ? (
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Denomination</label>
              <CustomSelect
                value={denomination}
                onChange={(v) => updateParam('denom', v)}
                options={denominations.map(d => ({ value: d, label: d === 'All' ? 'All Denominations' : d }))}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Sort By</label>
              <CustomSelect
                value={sortBy}
                onChange={(v) => updateParam('sort', v)}
                options={[
                  { value: 'rating', label: 'Highest Rated' },
                  { value: 'reviews', label: 'Most Reviewed' },
                  { value: 'newest', label: 'Recently Added' },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredProviders.map(p => {
          const img = providerImage(p);
          const icon = categoryIcon[p.category] || IconBuildingStore;
          const iconColor = categoryIconColor[p.category] || 'text-slate-500';
          return (
            <div key={p.id} className="relative min-w-0">
              <Link
                to={`/provider/${p.id}`}
                onClick={handleProviderClick}
                className={`group p-4 border shadow-sm [@media(hover:hover)]:hover:shadow-md transition-all flex flex-row items-center gap-4 ${reportingId === p.id || (p.listingTier === 'featured' && (p.phone || p.website)) ? 'rounded-t-2xl' : 'rounded-2xl'} ${p.listingTier === 'featured' ? 'bg-amber-50 border-amber-300 [@media(hover:hover)]:hover:border-amber-400 border-l-4' : 'bg-white border-slate-100 [@media(hover:hover)]:hover:border-blue-200'}`}
              >
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                  {img
                    ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    : (() => { const Icon = icon; return <Icon className={`w-7 h-7 ${iconColor}`} stroke={1.5} />; })()
                  }
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col gap-1.5 mb-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-xs font-semibold text-blue-600 px-2 py-0.5 bg-blue-50 rounded-lg">{p.category}</span>
                      {p.claimStatus === 'claimed' && (
                        <span className="text-[10px] font-semibold text-emerald-700 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                          <i className="fas fa-circle-check mr-0.5 text-[8px]"></i>Verified Business
                        </span>
                      )}
                      {p.listingTier === 'featured' && (
                        <span className="text-[10px] font-semibold text-amber-700 px-1.5 py-0.5 bg-amber-100 rounded-md border border-amber-200">
                          Sponsored
                        </span>
                      )}
                      {p.listingTier === 'spotlight' && (
                        <span className="text-[10px] font-bold text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded-md">
                          <i className="fas fa-star mr-0.5 text-[8px]"></i>Spotlight
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{p.town}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                  <div className="flex items-center flex-wrap gap-2 text-sm mt-2">
                    {p.category === 'Churches' ? null : p.reviewCount > 0 ? (
                      <>
                        <div className="flex items-center text-amber-500 font-bold">
                          <i className="fas fa-star mr-1 text-xs"></i>
                          {p.averageRating.toFixed(1)}
                        </div>
                        <div className="text-slate-400">({p.reviewCount} reviews)</div>
                        <div className="flex items-center text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg text-xs">
                          <i className="fas fa-thumbs-up mr-1 text-[10px]"></i>
                          {p.hireAgainPercent}% {hireAgainLabel(p.category)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No reviews yet</span>
                    )}
                  </div>
                </div>
                {/* Right column: status + flag + chevron */}
                <div className="flex flex-col items-end justify-between self-stretch py-0.5 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    {p.claimStatus !== 'claimed' && (
                      <span className="hidden sm:inline text-[10px] font-medium text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-full">Unclaimed</span>
                    )}
                    {user && (
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setReportingId(reportingId === p.id ? null : p.id); setReportReason(''); }}
                        className="text-slate-300 hover:text-red-400 transition-colors text-xs p-0.5"
                        title="Report this listing"
                      >
                        <i className="fas fa-flag"></i>
                      </button>
                    )}
                  </div>
                  <i className="fas fa-chevron-right text-slate-300 pr-2"></i>
                </div>
              </Link>
              {p.listingTier === 'featured' && (p.phone || p.website) && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-t-0 border-amber-300 border-l-4 rounded-b-2xl flex-wrap">
                  {p.phone && (
                    <a
                      href={`tel:${p.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-lg transition-colors"
                    >
                      <i className="fas fa-phone text-[10px]"></i>{p.phone}
                    </a>
                  )}
                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-lg transition-colors"
                    >
                      <i className="fas fa-globe text-[10px]"></i>Visit Website
                    </a>
                  )}
                </div>
              )}
              {reportingId === p.id && (
                <div className="bg-white border border-t-0 border-slate-100 shadow-sm rounded-b-2xl px-4 pb-4 pt-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Report this listing</p>
                  <textarea
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Please describe the issue (required)"
                    rows={2}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-red-300 outline-none resize-none mb-1"
                  />
                  {reportReason.length > 0 && reportReason.trim().length < 10 && (
                    <p className="text-[10px] text-red-400 mb-2">Please provide at least 10 characters.</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSubmitReport(p.id, p.name)}
                      disabled={submittingReport || reportReason.trim().length < 10}
                      className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {submittingReport ? 'Reporting...' : 'Submit Report'}
                    </button>
                    <button
                      onClick={() => { setReportingId(null); setReportReason(''); }}
                      className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredProviders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-4xl mb-4 text-slate-200"><i className="fas fa-magnifying-glass"></i></div>
            <p className="text-slate-500 mb-4">No businesses found in this category yet.</p>
            <Link to="/ask" className="text-blue-600 font-bold">Ask the community for a recommendation</Link>
          </div>
        )}
      </div>

      {/* Transparency footer */}
      <p className="text-center text-slate-400 text-xs leading-relaxed pt-2 pb-1">
        Business information sourced from publicly available data. Owners may claim or request updates by clicking into their listing.
      </p>
    </div>
  );
};

export default Directory;
