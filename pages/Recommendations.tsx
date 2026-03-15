
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RecommendationRequest, RecommendationResponse, Town } from '../types';
import { addRequest, deleteRequest, fetchAllRecommendationResponses, submitReport } from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface RecommendationsProps {
  requests: RecommendationRequest[];
  setRequests: React.Dispatch<React.SetStateAction<RecommendationRequest[]>>;
  user: { id: string, name: string, role?: string } | null;
}

const Recommendations: React.FC<RecommendationsProps> = ({ requests, setRequests, user }) => {
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [service, setService] = useState('');
  const [desc, setDesc] = useState('');
  const [town, setTown] = useState<Town>(tenant.towns[0]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [responses, setResponses] = useState<Record<string, RecommendationResponse[]>>({});

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

  const handleShare = async (req: RecommendationRequest) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const url = req.slug ? `${base}#/ask/${req.slug}` : `${base}#/ask`;
    if (navigator.share) {
      try { await navigator.share({ title: req.serviceNeeded, url }); } catch { /* dismissed */ }
    } else {
      try { await navigator.clipboard.writeText(url); alert('Link copied!'); } catch { alert('Could not copy link.'); }
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


  return (
    <div className="space-y-6">
      {notice && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="ml-4 text-orange-400 hover:text-orange-600 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-slate-900">Ask the Community</h1>
          <p className="text-slate-500 text-sm">Need a recommendation, service, or local advice?</p>
          <p className="text-slate-500 text-sm">Try searching the <Link to="/directory" className="text-blue-600 hover:underline font-medium">Local Businesses</Link> directory first. If you can't find what you need, ask the community.</p>
        </div>
        {!showForm && (
          <div className="pt-1">
            {user ? (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors"
              >
                Ask a Question
              </button>
            ) : (
              <Link
                to="/auth?signup=true"
                state={{ from: location.pathname }}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors"
              >
                Ask a Question
              </Link>
            )}
          </div>
        )}
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
          const topPick = reqResponses[0] ?? null;
          const detailTo = req.slug ? `/ask/${req.slug}` : null;

          const CardWrapper = ({ children }: { children: React.ReactNode }) =>
            detailTo ? (
              <Link to={detailTo} className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all overflow-hidden">
                {children}
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {children}
              </div>
            );

          return (
            <React.Fragment key={req.id}>
            <CardWrapper>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <i className="fas fa-user text-xs"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{req.userName}</div>
                      <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()} · {req.town}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase flex-shrink-0 ml-2 ${req.status === 'open' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {req.status === 'open' ? 'Looking' : 'Answered'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 mb-1 break-words">{req.serviceNeeded}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 break-words">{req.description}</p>

                {/* Top pick preview */}
                {topPick && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 mt-0.5">Top Pick</span>
                    <p className="text-slate-700 text-xs line-clamp-2 flex-1">{topPick.recommendation}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs font-medium">
                    <i className="fas fa-comment mr-1"></i>
                    {req.responseCount} {req.responseCount === 1 ? 'recommendation' : 'recommendations'}
                  </span>
                  {detailTo && (
                    <span className="text-blue-500 text-xs font-semibold">
                      View all <i className="fas fa-arrow-right text-[10px] ml-0.5"></i>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
                  <button
                    onClick={() => handleShare(req)}
                    className="text-slate-300 hover:text-blue-400 transition-colors text-xs p-1"
                    title="Share this request"
                  >
                    <i className="fas fa-share-alt"></i>
                  </button>
                  {!!(user && user.id !== req.userId && !isAdminOrMod) && (
                    <button
                      onClick={() => { setReportingId(reportingId === req.id ? null : req.id); setReportReason(''); }}
                      className="text-slate-300 hover:text-red-400 transition-colors text-xs p-1"
                      title="Report this request"
                    >
                      <i className="fas fa-flag"></i>
                    </button>
                  )}
                  {!!(user && (user.id === req.userId || isAdminOrMod)) && (
                    <button onClick={() => handleDelete(req.id)} className="text-xs font-bold text-red-400 hover:text-red-600">
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Report form */}
              {reportingId === req.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 pb-4 pt-3" onClick={e => e.preventDefault()}>
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
            </CardWrapper>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Recommendations;
