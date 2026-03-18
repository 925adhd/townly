
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Provider, RecommendationRequest, LostFoundPost, CommunityEvent } from '../types';
import { fetchProviders, fetchRequests, fetchLostFound, fetchApprovedCommunityEvents } from '../lib/api';

const Search: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') || '';
  const [input, setInput] = useState(query);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [questions, setQuestions] = useState<RecommendationRequest[]>([]);
  const [lostFound, setLostFound] = useState<LostFoundPost[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setInput(query); }, [query]);

  useEffect(() => {
    Promise.all([fetchProviders(), fetchRequests(), fetchLostFound(), fetchApprovedCommunityEvents()])
      .then(([p, q, lf, ev]) => { setProviders(p); setQuestions(q); setLostFound(lf); setEvents(ev); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const match = (text: string) => { const t = text.toLowerCase(); return words.every(w => t.includes(w)); };

  const bizResults = useMemo(() => q.length < 2 ? [] :
    providers.filter(p => p.status === 'approved' && match([p.name, p.subcategory || '', p.category, p.description || '', p.town, ...(p.tags || [])].join(' '))),
  [q, providers]);

  const questionResults = useMemo(() => q.length < 2 ? [] :
    questions.filter(r => match([r.serviceNeeded, r.description || '', r.town].join(' '))),
  [q, questions]);

  const lfResults = useMemo(() => q.length < 2 ? [] :
    lostFound.filter(p => p.status === 'active' && match([p.title, p.description || '', p.town].join(' '))),
  [q, lostFound]);

  const eventResults = useMemo(() => q.length < 2 ? [] :
    events.filter(e => match([e.title, e.description || '', e.location || '', e.town].join(' '))),
  [q, events]);

  const totalResults = bizResults.length + questionResults.length + lfResults.length + eventResults.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) navigate(`/search?q=${encodeURIComponent(input.trim())}`);
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-5">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Search everything..."
          autoFocus
          className="w-full h-12 pl-10 pr-24 bg-white border border-slate-200 rounded-xl shadow-sm text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
        />
        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow hover:bg-orange-500 transition-colors">
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <i className="fas fa-spinner fa-spin mr-2"></i> Searching...
        </div>
      ) : q.length < 2 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Type at least 2 characters to search.</div>
      ) : totalResults === 0 ? (
        <div className="text-center py-12 space-y-2">
          <i className="fas fa-search text-3xl text-slate-200"></i>
          <p className="text-slate-500 text-sm">No results for "{query}"</p>
          <p className="text-slate-400 text-xs">Try different keywords or browse the sections below.</p>
          <div className="flex flex-wrap justify-center gap-2 pt-3">
            <Link to="/directory" className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">Browse Businesses</Link>
            <Link to="/ask" className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors">Browse Questions</Link>
            <Link to="/events" className="text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">Browse Events</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-slate-400 text-xs">{totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"</p>

          {/* Businesses */}
          {bizResults.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-store text-blue-500 text-xs"></i> Businesses
                  <span className="text-slate-400 font-normal normal-case tracking-normal">({bizResults.length})</span>
                </h2>
                <Link to={`/directory?q=${encodeURIComponent(query)}`} className="text-xs font-semibold text-orange-500 hover:underline">
                  View in Directory <i className="fas fa-arrow-right text-[10px] ml-0.5"></i>
                </Link>
              </div>
              <div className="space-y-2">
                {bizResults.slice(0, 6).map(p => (
                  <Link key={p.id} to={`/provider/${p.id}`} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.image
                        ? <img src={p.image} alt="" className="w-full h-full object-cover" />
                        : <i className="fas fa-store text-slate-400 text-sm"></i>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.subcategory || p.category} · {p.town}</p>
                    </div>
                    <i className="fas fa-chevron-right text-slate-300 text-[10px] flex-shrink-0"></i>
                  </Link>
                ))}
                {bizResults.length > 6 && (
                  <Link to={`/directory?q=${encodeURIComponent(query)}`} className="block text-center text-xs font-semibold text-slate-400 hover:text-orange-500 py-1.5">
                    View all {bizResults.length} businesses
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Questions */}
          {questionResults.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-comments text-violet-500 text-xs"></i> Questions
                  <span className="text-slate-400 font-normal normal-case tracking-normal">({questionResults.length})</span>
                </h2>
                <Link to="/ask" className="text-xs font-semibold text-orange-500 hover:underline">
                  View all <i className="fas fa-arrow-right text-[10px] ml-0.5"></i>
                </Link>
              </div>
              <div className="space-y-2">
                {questionResults.slice(0, 5).map(r => (
                  <Link key={r.id} to={r.slug ? `/ask/${r.slug}` : '/ask'} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] transition-all">
                    <i className="fas fa-comments text-violet-400 text-sm w-10 text-center flex-shrink-0"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{r.serviceNeeded}</p>
                      <p className="text-xs text-slate-400 truncate">{r.town} · {r.status === 'open' ? 'Open' : 'Answered'}</p>
                    </div>
                    <i className="fas fa-chevron-right text-slate-300 text-[10px] flex-shrink-0"></i>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Lost & Found */}
          {lfResults.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-paw text-amber-600 text-xs"></i> Lost & Found
                  <span className="text-slate-400 font-normal normal-case tracking-normal">({lfResults.length})</span>
                </h2>
                <Link to="/lost-found" className="text-xs font-semibold text-orange-500 hover:underline">
                  View all <i className="fas fa-arrow-right text-[10px] ml-0.5"></i>
                </Link>
              </div>
              <div className="space-y-2">
                {lfResults.slice(0, 5).map(p => (
                  <Link key={p.id} to="/lost-found" className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] transition-all">
                    <i className={`fas fa-paw text-sm w-10 text-center flex-shrink-0 ${p.type.startsWith('lost') ? 'text-red-400' : 'text-emerald-500'}`}></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.title}</p>
                      <p className="text-xs text-slate-400 truncate">{p.town} · {p.type.startsWith('lost') ? 'Lost' : 'Found'}</p>
                    </div>
                    <i className="fas fa-chevron-right text-slate-300 text-[10px] flex-shrink-0"></i>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Events */}
          {eventResults.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-calendar-alt text-orange-500 text-xs"></i> Events
                  <span className="text-slate-400 font-normal normal-case tracking-normal">({eventResults.length})</span>
                </h2>
                <Link to="/events" className="text-xs font-semibold text-orange-500 hover:underline">
                  View all <i className="fas fa-arrow-right text-[10px] ml-0.5"></i>
                </Link>
              </div>
              <div className="space-y-2">
                {eventResults.slice(0, 5).map(e => (
                  <Link key={e.id} to="/events" className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] transition-all">
                    <i className="fas fa-calendar-alt text-orange-400 text-sm w-10 text-center flex-shrink-0"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{e.title}</p>
                      <p className="text-xs text-slate-400 truncate">{e.town}{e.eventDate ? ` · ${new Date(e.eventDate).toLocaleDateString()}` : ''}</p>
                    </div>
                    <i className="fas fa-chevron-right text-slate-300 text-[10px] flex-shrink-0"></i>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
