
import React, { useState, useEffect } from 'react';
import { RecommendationRequest, RecommendationResponse, Town } from '../types';
import { addRequest, resolveRequest, unresolveRequest, deleteRequest, deleteResponse, fetchAllRecommendationResponses, addResponse, fetchUserVotedResponseIds, toggleResponseVote, submitReport } from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface RecommendationsProps {
  requests: RecommendationRequest[];
  setRequests: React.Dispatch<React.SetStateAction<RecommendationRequest[]>>;
  user: { id: string, name: string, role?: string } | null;
}

const Recommendations: React.FC<RecommendationsProps> = ({ requests, setRequests, user }) => {
  const [showForm, setShowForm] = useState(false);
  const [service, setService] = useState('');
  const [desc, setDesc] = useState('');
  const [town, setTown] = useState<Town>(tenant.towns[0]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [responses, setResponses] = useState<Record<string, RecommendationResponse[]>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);

  const [notice, setNotice] = useState('');

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleSubmitReport = async (
    contentId: string,
    contentTitle: string,
    contentType: 'recommendation_request' | 'recommendation_response'
  ) => {
    if (!user) return;
    setSubmittingReport(true);
    try {
      await submitReport(contentType, contentId, contentTitle, reportReason);
      setReportingId(null);
      setReportReason('');
      setNotice('Report submitted. Thank you.');
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setNotice(err.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const towns: Town[] = tenant.towns;
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    fetchAllRecommendationResponses().then(all => {
      const grouped: Record<string, RecommendationResponse[]> = {};
      for (const r of all) {
        if (!grouped[r.requestId]) grouped[r.requestId] = [];
        grouped[r.requestId].push(r);
      }
      setResponses(grouped);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserVotedResponseIds(user.id).then(ids => {
        setUserVotes(new Set(ids));
      }).catch(console.error);
    } else {
      setUserVotes(new Set());
    }
  }, [user]);

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
      setResponses(prev => {
        const updated: Record<string, RecommendationResponse[]> = {};
        for (const [reqId, resps] of Object.entries(prev)) {
          updated[reqId] = resps.map(r =>
            r.id === responseId ? { ...r, voteCount: newCount } : r
          );
        }
        return updated;
      });
    } catch (err: any) {
      setNotice(err.message || 'Failed to vote.');
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setFormError('Please log in to post a request.'); return; }
    setFormError('');
    setFormLoading(true);
    try {
      const newReq = await addRequest({ serviceNeeded: service, description: desc, town }, user.id, user.name);
      setRequests(prev => [newReq, ...prev]);
      setShowForm(false);
      setService('');
      setDesc('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to post request. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent, requestId: string) => {
    e.preventDefault();
    if (!user) { setNotice('Please log in to give a recommendation.'); return; }
    setReplyError('');
    setReplyLoading(true);
    try {
      const resp = await addResponse(requestId, replyText, user.id, user.name);
      setResponses(prev => ({
        ...prev,
        [requestId]: [...(prev[requestId] || []), resp],
      }));
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, responseCount: r.responseCount + 1 } : r
      ));
      setReplyText('');
      setReplyingTo(null);
    } catch (err: any) {
      setReplyError(err.message || 'Failed to submit recommendation.');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' as const } : r));
    } catch (err: any) {
      setNotice(err.message || 'Failed to mark resolved.');
    }
  };

  const handleUnresolve = async (id: string) => {
    try {
      await unresolveRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'open' as const } : r));
    } catch (err: any) {
      setNotice(err.message || 'Failed to reopen request.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setNotice(err.message || 'Failed to delete request.');
    }
  };

  const handleDeleteResponse = async (requestId: string, responseId: string) => {
    try {
      await deleteResponse(responseId);
      setResponses(prev => ({
        ...prev,
        [requestId]: (prev[requestId] || []).filter(r => r.id !== responseId),
      }));
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, responseCount: Math.max(0, r.responseCount - 1) } : r
      ));
    } catch (err: any) {
      setNotice(err.message || 'Failed to delete response.');
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="ml-4 text-orange-400 hover:text-orange-600 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-center md:text-left">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ask the Community</h1>
          <p className="text-slate-500">Can't find a service? Ask locals for recommendations.</p>
        </div>
        <div className="flex items-center justify-center md:justify-start gap-3">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors"
            >
              Post a Request
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xl">
          <h2 className="text-lg font-bold mb-4">What service are you looking for?</h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Service Name</label>
                <input
                  type="text"
                  name="service"
                  required
                  placeholder="e.g. Land Surveyor, Piano Tuner"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={service}
                  onChange={e => setService(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Town/Area</label>
                <CustomSelect
                  value={town}
                  onChange={(v) => setTown(v as Town)}
                  options={towns.map(t => ({ value: t, label: t }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Tell us more</label>
              <textarea
                required
                rows={3}
                placeholder="Details about your project, location, or urgency..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={desc}
                onChange={e => setDesc(e.target.value)}
              ></textarea>
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{formError}</div>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={formLoading} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60">
                {formLoading ? 'Posting...' : 'Post Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {requests.map(req => {
          const reqResponses = [...(responses[req.id] || [])].sort((a, b) => b.voteCount - a.voteCount);
          const isReplying = replyingTo === req.id;

          return (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <i className="fas fa-user"></i>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{req.userName} is looking for:</div>
                      <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()} • {req.town}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${req.status === 'open' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {req.status === 'open' ? 'Looking' : 'Answered'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">{req.serviceNeeded}</h3>
                <p className="text-slate-600 text-sm mb-4">{req.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    className="text-orange-600 font-bold text-sm hover:underline"
                    onClick={() => {
                      if (!user) { setNotice('Please log in to give a recommendation.'); return; }
                      setNotice('');
                      setReplyText('');
                      setReplyError('');
                      setReplyingTo(isReplying ? null : req.id);
                    }}
                  >
                    <i className="fas fa-reply mr-2"></i>
                    {isReplying ? 'Cancel' : 'Give Recommendation'}
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-medium">
                      {req.responseCount} {req.responseCount === 1 ? 'suggestion' : 'suggestions'}
                    </span>
                    {!!(user && user.id !== req.userId && !isAdminOrMod) && (
                      <button
                        onClick={() => { setReportingId(reportingId === req.id ? null : req.id); setReportReason(''); }}
                        className="text-slate-300 hover:text-red-400 transition-colors text-xs"
                        title="Report this request"
                      >
                        <i className="fas fa-flag"></i>
                      </button>
                    )}
                    {!!(user && (user.id === req.userId || isAdminOrMod)) && (
                      <>
                        {req.status === 'open' && (
                          <button onClick={() => handleResolve(req.id)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                            Mark as Answered
                          </button>
                        )}
                        {req.status === 'resolved' && (
                          <button onClick={() => handleUnresolve(req.id)} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                            Still Looking
                          </button>
                        )}
                        <button onClick={() => handleDelete(req.id)} className="text-xs font-bold text-red-400 hover:text-red-600">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {reportingId === req.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 pb-4 pt-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Report this request</p>
                  <textarea
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Why are you reporting this? (optional)"
                    rows={2}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-red-300 outline-none resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmitReport(req.id, req.serviceNeeded, 'recommendation_request')}
                      disabled={submittingReport}
                      className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {submittingReport ? 'Reporting...' : 'Submit Report'}
                    </button>
                    <button
                      onClick={() => { setReportingId(null); setReportReason(''); }}
                      className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Inline reply form */}
              {isReplying && (
                <div className="border-t border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Your Recommendation</p>
                  <form onSubmit={e => handleReply(e, req.id)} className="space-y-3">
                    <textarea
                      required
                      rows={3}
                      autoFocus
                      placeholder={`Who would you recommend for "${req.serviceNeeded}"? Include their name, phone, or Facebook if you have it.`}
                      className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                    />
                    {replyError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{replyError}</div>
                    )}
                    <button type="submit" disabled={replyLoading} className="bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-60 text-sm">
                      {replyLoading ? 'Submitting...' : 'Submit Recommendation'}
                    </button>
                  </form>
                </div>
              )}

              {/* Responses sorted by votes */}
              {reqResponses.length > 0 && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {reqResponses.map((r, idx) => {
                    const voted = userVotes.has(r.id);
                    const isVoting = votingId === r.id;
                    const isTop = idx === 0 && r.voteCount > 0;
                    return (
                      <div key={r.id} className={`px-5 py-4 flex items-start space-x-3 ${isTop ? 'bg-amber-50' : ''}`}>
                        {/* Vote button */}
                        <button
                          onClick={() => handleVote(r.id)}
                          disabled={isVoting}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0 mt-0.5 disabled:opacity-50 ${
                            voted
                              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300 hover:text-orange-500'
                          }`}
                        >
                          <i className="fas fa-arrow-up text-[10px]"></i>
                          <span>{voted ? 'Voted' : 'Upvote'}</span>
                          <span className={`font-bold tabular-nums ${voted ? 'text-orange-100' : 'text-slate-400'}`}>
                            {r.voteCount}
                          </span>
                        </button>

                        {/* Avatar + content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-[10px] uppercase flex-shrink-0">
                              {r.userName.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{r.userName}</span>
                            <span className="text-slate-400 text-xs font-normal">· {new Date(r.createdAt).toLocaleDateString()}</span>
                            {isTop && (
                              <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Top Pick
                              </span>
                            )}
                            {!!(user && user.id !== r.userId && !isAdminOrMod) && (
                              <button
                                onClick={() => { setReportingId(reportingId === r.id ? null : r.id); setReportReason(''); }}
                                className="ml-auto text-slate-300 hover:text-red-400 transition-colors text-[10px]"
                                title="Report this response"
                              >
                                <i className="fas fa-flag"></i>
                              </button>
                            )}
                            {!!(user && (user.id === r.userId || isAdminOrMod)) && (
                              <button
                                onClick={() => handleDeleteResponse(req.id, r.id)}
                                className="ml-auto text-[10px] font-bold text-red-400 hover:text-red-600"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                          <p className="text-slate-700 text-sm">{r.recommendation}</p>
                          {reportingId === r.id && (
                            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Report this response</p>
                              <textarea
                                value={reportReason}
                                onChange={e => setReportReason(e.target.value)}
                                placeholder="Why are you reporting this? (optional)"
                                rows={2}
                                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-red-300 outline-none resize-none mb-2"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSubmitReport(r.id, `Response by ${r.userName}`, 'recommendation_response')}
                                  disabled={submittingReport}
                                  className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                  {submittingReport ? 'Reporting...' : 'Submit Report'}
                                </button>
                                <button
                                  onClick={() => { setReportingId(null); setReportReason(''); }}
                                  className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {requests.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">
              No requests yet. Be the first to ask!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
