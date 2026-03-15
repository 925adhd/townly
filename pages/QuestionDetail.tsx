
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RecommendationRequest, RecommendationResponse, Provider } from '../types';
import {
  fetchRequestBySlug,
  fetchResponsesByRequestId,
  addResponse,
  updateResponse,
  deleteResponse,
  toggleResponseVote,
  fetchUserVotedResponseIds,
  acceptResponse,
  unresolveRequest,
} from '../lib/api';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

// ── OG meta tag helpers ────────────────────────────────────────────────────────
function setMetaTag(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// ── Related businesses (keyword match) ────────────────────────────────────────
function findRelatedProviders(serviceNeeded: string, providers: Provider[]): Provider[] {
  const stopWords = new Set(['the', 'and', 'for', 'who', 'what', 'where', 'does', 'any', 'can', 'you', 'best', 'good', 'near', 'local']);
  const keywords = serviceNeeded
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  if (keywords.length === 0) return [];

  return providers
    .filter(p => p.status === 'approved')
    .map(p => {
      const text = `${p.name} ${p.category} ${p.subcategory ?? ''} ${p.description ?? ''}`.toLowerCase();
      const score = keywords.filter(k => text.includes(k)).length;
      return { provider: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ provider }) => provider);
}

// ── Match a mentioned business in a response ──────────────────────────────────
function findMentionedProvider(text: string, providers: Provider[]): Provider | null {
  const lower = text.toLowerCase();
  // Only match names with 2+ words to avoid false positives on single common words
  return providers.find(p =>
    p.status === 'approved' && p.name.split(' ').length >= 2 && lower.includes(p.name.toLowerCase())
  ) ?? null;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface QuestionDetailProps {
  providers: Provider[];
  user: { id: string; name: string; role?: string } | null;
}

const QuestionDetail: React.FC<QuestionDetailProps> = ({ providers, user }) => {
  const { slug } = useParams<{ slug: string }>();

  const [request, setRequest] = useState<RecommendationRequest | null>(null);
  const [responses, setResponses] = useState<RecommendationResponse[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [editingMyResponse, setEditingMyResponse] = useState(false);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Load question + responses ──────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchRequestBySlug(slug)
      .then(async req => {
        if (!req) { setNotFound(true); setLoading(false); return; }
        setRequest(req);
        const resps = await fetchResponsesByRequestId(req.id);
        setResponses(resps);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  // ── Load user votes ────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      fetchUserVotedResponseIds(user.id).then(ids => setUserVotes(new Set(ids))).catch(console.error);
    }
  }, [user]);

  // ── OG / document.title ───────────────────────────────────────────────────
  useEffect(() => {
    if (!request) return;
    document.title = `${request.serviceNeeded} — Ask the Community | ${tenant.displayName}`;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/ask/${request.slug}`;
    setMetaTag('og:title', request.serviceNeeded);
    setMetaTag('og:description', request.description.slice(0, 150));
    setMetaTag('og:type', 'website');
    setMetaTag('og:url', shareUrl);
    return () => { document.title = tenant.displayName; };
  }, [request]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}#/ask/${slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: request?.serviceNeeded ?? 'Ask the Community', url }); } catch { /* dismissed */ }
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }, [slug, request?.serviceNeeded]);

  // ── Vote ───────────────────────────────────────────────────────────────────
  const handleVote = async (responseId: string) => {
    if (!user) { setNotice('Please log in to vote.'); return; }
    setVotingId(responseId);
    const hasVoted = userVotes.has(responseId);
    try {
      const newCount = await toggleResponseVote(responseId, user.id, hasVoted);
      setUserVotes(prev => {
        const next = new Set(prev);
        hasVoted ? next.delete(responseId) : next.add(responseId);
        return next;
      });
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, voteCount: newCount } : r));
    } catch (err: any) {
      setNotice(err.message || 'Failed to vote.');
    } finally {
      setVotingId(null);
    }
  };

  // ── Reply ──────────────────────────────────────────────────────────────────
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !request) return;
    setReplyError('');
    setReplyLoading(true);
    try {
      const resp = await addResponse(request.id, replyText, user.id, replyAnonymous ? 'Anonymous' : user.name);
      setResponses(prev => [...prev, resp].sort((a, b) => b.voteCount - a.voteCount));
      setRequest(prev => prev ? { ...prev, responseCount: prev.responseCount + 1 } : prev);
      setReplyText('');
      setShowReplyForm(false);
    } catch (err: any) {
      setReplyError(err.message || 'Failed to submit.');
    } finally {
      setReplyLoading(false);
    }
  };

  // ── Edit / delete own response ────────────────────────────────────────────
  const handleEditResponse = async (responseId: string) => {
    setEditError('');
    setEditLoading(true);
    try {
      await updateResponse(responseId, editText);
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, recommendation: editText } : r));
      setEditingMyResponse(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteMyResponse = async (responseId: string) => {
    try {
      await deleteResponse(responseId);
      setResponses(prev => prev.filter(r => r.id !== responseId));
      setRequest(prev => prev ? { ...prev, responseCount: Math.max(0, prev.responseCount - 1) } : prev);
    } catch (err: any) {
      setNotice(err.message || 'Failed to delete.');
    }
  };

  // ── Accept a response / unresolve ─────────────────────────────────────────
  const handleAccept = async (responseId: string) => {
    if (!request) return;
    try {
      await acceptResponse(request.id, responseId);
      setRequest(prev => prev ? { ...prev, status: 'resolved', acceptedResponseId: responseId } : prev);
    } catch (err: any) {
      setNotice(err.message || 'Failed to mark answered.');
    }
  };

  const handleUnresolve = async () => {
    if (!request) return;
    try {
      await unresolveRequest(request.id);
      setRequest(prev => prev ? { ...prev, status: 'open', acceptedResponseId: undefined } : prev);
    } catch (err: any) {
      setNotice(err.message || 'Failed to update status.');
    }
  };

  const relatedProviders = request ? findRelatedProviders(request.serviceNeeded, providers) : [];
  const isOwner = user && request && user.id === request.userId;
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';
  const myResponse = user ? (responses.find(r => r.userId === user.id) ?? null) : null;
  const hasResponded = !!myResponse;

  // ── Loading / not found ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm font-medium">Loading...</div>
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-slate-500 text-lg mb-4">This question doesn't exist or was removed.</p>
        <Link to="/ask" className="text-blue-600 hover:underline font-medium">Back to Ask the Community</Link>
      </div>
    );
  }

  // ── Share button ───────────────────────────────────────────────────────────
  const ShareButton = () => (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm flex-shrink-0"
    >
      <i className={`fas ${copied ? 'fa-check text-emerald-500' : 'fa-share-nodes'}`}></i>
      <span className="hidden sm:inline">{copied ? 'Link copied!' : 'Share'}</span>
    </button>
  );

  return (
    // pb-24 ensures content clears the mobile nav bar (h-16 = 64px)
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Back nav */}
      <Link to="/ask" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
        <i className="fas fa-arrow-left text-xs"></i>
        Ask the Community
      </Link>

      {notice && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="ml-4 text-orange-400 hover:text-orange-600 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex-shrink-0 ${request.status === 'open' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {request.status === 'open' ? 'Looking' : '✔ Answered'}
              </span>
              {(isOwner || isAdminOrMod) && request.status === 'resolved' && (
                <button
                  onClick={handleUnresolve}
                  className="text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors flex-shrink-0"
                >
                  Mark as Still Looking
                </button>
              )}
            </div>
            <ShareButton />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-3 break-words">{request.serviceNeeded}</h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
            <span className="flex items-center gap-1">
              <i className="fas fa-user"></i>
              {request.userName}
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-map-marker-alt"></i>
              {request.town}
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-calendar"></i>
              {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-comment"></i>
              {request.responseCount} {request.responseCount === 1 ? 'response' : 'responses'}
            </span>
          </div>

          <p className="text-slate-700 leading-relaxed break-words">{request.description}</p>

        </div>
      </div>

      {/* Responses */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>💡</span>
          {responses.length > 0
            ? `${responses.length} Community ${responses.length === 1 ? 'Recommendation' : 'Recommendations'}`
            : 'Community Recommendations'}
        </h2>

        {responses.length === 0 && (
          <p className="text-slate-400 text-sm italic">No recommendations yet — be the first to help.</p>
        )}

        {[...responses]
          .sort((a, b) => {
            // Accepted response always floats to top
            if (a.id === request.acceptedResponseId) return -1;
            if (b.id === request.acceptedResponseId) return 1;
            return b.voteCount - a.voteCount;
          })
          .map((r, idx) => {
          const voted = userVotes.has(r.id);
          const isVoting = votingId === r.id;
          const isAnswered = request.status === 'resolved';
          const isAccepted = isAnswered && r.id === request.acceptedResponseId;
          const isTopPick = !isAnswered && idx === 0 && r.voteCount > 0;
          const mentionedBiz = findMentionedProvider(r.recommendation, providers);

          return (
            <div key={r.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              isAccepted ? 'border-emerald-200' : isTopPick ? 'border-amber-200' : 'border-slate-100'
            }`}>
              {/* Accepted / Top Pick header strip */}
              {isAccepted && (
                <div className="bg-emerald-600 px-4 py-1.5 flex items-center gap-1.5">
                  <span className="text-white text-[11px] font-bold uppercase tracking-wide">⭐ Accepted Recommendation</span>
                </div>
              )}
              {isTopPick && (
                <div className="bg-amber-400 px-4 py-1.5 flex items-center gap-1.5">
                  <span className="text-white text-[11px] font-bold uppercase tracking-wide">Top Pick</span>
                </div>
              )}
              <div className={`p-5 flex items-start gap-4 ${isAccepted ? 'bg-emerald-50' : isTopPick ? 'bg-amber-50' : ''}`}>
              {/* Vote */}
              <button
                onClick={() => handleVote(r.id)}
                disabled={isVoting}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex-shrink-0 disabled:opacity-50 ${
                  voted
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-orange-300 hover:text-orange-500'
                }`}
              >
                <i className="fas fa-arrow-up text-[10px]"></i>
                <span className="tabular-nums">{r.voteCount}</span>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs uppercase flex-shrink-0">
                    {r.userName.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-slate-800">{r.userName}</span>
                  <span className="text-slate-400 text-xs">· {new Date(r.createdAt).toLocaleDateString()}</span>
                  {isAdminOrMod && (
                    <button
                      onClick={() => handleDeleteMyResponse(r.id)}
                      className="ml-auto text-slate-300 hover:text-red-500 transition-colors text-xs p-1 flex-shrink-0"
                      title="Delete response (admin)"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>

                <p className="text-slate-700 text-sm leading-relaxed break-words">{r.recommendation}</p>

                {/* Accept button — owner only, question still open */}
                {isOwner && !isAnswered && (
                  <button
                    onClick={() => handleAccept(r.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                  >
                    <i className="fas fa-check-circle"></i>
                    This answered my question
                  </button>
                )}

                {/* Matched business link */}
                {mentionedBiz && (
                  <Link
                    to={`/provider/${mentionedBiz.id}`}
                    className="mt-3 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-blue-300 transition-all group"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      {mentionedBiz.image
                        ? <img src={mentionedBiz.image} alt={mentionedBiz.name} className="w-8 h-8 object-cover rounded-lg" />
                        : <i className="fas fa-store text-slate-400 text-xs"></i>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{mentionedBiz.name}</p>
                      {mentionedBiz.reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <i className="fas fa-star text-amber-400 text-[9px]"></i>
                          <span className="text-[11px] font-semibold text-slate-600">{mentionedBiz.averageRating.toFixed(1)}</span>
                          <span className="text-[11px] text-slate-400">({mentionedBiz.reviewCount})</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-blue-600 flex-shrink-0 group-hover:underline">View Business</span>
                  </Link>
                )}
              </div>
              </div>
            </div>
          );
        })}

        {/* Answered notice */}
        {request.status === 'resolved' && !showReplyForm && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">
            <i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i>
            <span>This question has been answered. You can still add recommendations to help future visitors.</span>
          </div>
        )}

        {/* Reply form */}
        {user && isOwner ? null : user ? (
          hasResponded && myResponse ? (
            editingMyResponse ? (
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Edit Your Recommendation</p>
                <textarea
                  required
                  rows={3}
                  autoFocus
                  className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-3"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                />
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-3">{editError}</div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => handleEditResponse(myResponse.id)} disabled={editLoading} className="bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-60 text-sm">
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditingMyResponse(false)} className="px-5 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-medium"><i className="fas fa-check-circle text-emerald-500 mr-1.5"></i>You've submitted a recommendation.</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => { setEditText(myResponse.recommendation); setEditingMyResponse(true); setEditError(''); }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMyResponse(myResponse.id)}
                    className="text-xs font-bold text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          ) : showReplyForm ? (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Your Recommendation</p>
              <form onSubmit={handleReply} className="space-y-3">
                <textarea
                  required
                  rows={3}
                  autoFocus
                  placeholder={`Who would you recommend for "${request.serviceNeeded}"? Include their name, phone, or Facebook if you have it.`}
                  className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
                <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={replyAnonymous}
                    onChange={e => setReplyAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">Post anonymously</span>
                </label>
                {replyError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{replyError}</div>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={replyLoading} className="bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-60 text-sm">
                    {replyLoading ? 'Submitting...' : 'Submit Recommendation'}
                  </button>
                  <button type="button" onClick={() => setShowReplyForm(false)} className="px-5 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowReplyForm(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-semibold hover:border-orange-300 hover:text-orange-600 transition-all"
            >
              <i className="fas fa-reply mr-2"></i>Give a Recommendation
            </button>
          )
        ) : (
          <Link
            to="/auth?signup=true"
            className="block text-center w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-semibold hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            Log in to help answer this question
          </Link>
        )}
      </div>

      {/* Related businesses */}
      {relatedProviders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Local Businesses That May Help</h2>
          <div className="grid gap-3">
            {relatedProviders.map(p => (
              <Link
                key={p.id}
                to={`/provider/${p.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 overflow-hidden hover:border-blue-200 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {p.image
                    ? <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-xl" />
                    : <i className="fas fa-store text-slate-400 text-lg"></i>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 truncate">{p.category}{p.subcategory ? ` · ${p.subcategory}` : ''} · {p.town}</p>
                  {p.reviewCount > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <i className="fas fa-star text-amber-400 text-[10px]"></i>
                      <span className="text-xs font-semibold text-slate-600">{p.averageRating.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({p.reviewCount})</span>
                    </div>
                  )}
                </div>
                <i className="fas fa-chevron-right text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0"></i>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom share CTA — sits above mobile nav due to pb-24 on wrapper */}
      <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
        <p className="text-slate-700 font-semibold mb-3">Know someone who can help? Share this question.</p>
        <ShareButton />
      </div>
    </div>
  );
};

export default QuestionDetail;
