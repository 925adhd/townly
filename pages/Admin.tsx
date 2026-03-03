
import React, { useEffect, useState } from 'react';
import { Provider, ContentReport, ReportContentType, ListingClaim, CommunityEvent } from '../types';
import { fetchPendingProviders, approveProvider, rejectProvider, fetchReports, dismissReport, removeContent, fetchPendingClaims, approveClaim, rejectClaim, fetchPendingCommunityEvents, approveCommunityEvent, rejectCommunityEvent } from '../lib/api';

interface AdminProps {
  user: { id: string; name: string; role?: string } | null;
}

const contentTypeLabel: Record<ReportContentType, string> = {
  provider: 'Provider',
  lost_found: 'Lost & Found',
  recommendation_request: 'Ask Request',
  recommendation_response: 'Recommendation',
};

const contentTypeBadge: Record<ReportContentType, string> = {
  provider: 'bg-blue-100 text-blue-700',
  lost_found: 'bg-orange-100 text-orange-700',
  recommendation_request: 'bg-purple-100 text-purple-700',
  recommendation_response: 'bg-slate-100 text-slate-600',
};

const Admin: React.FC<AdminProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'flagged' | 'claims' | 'events'>('pending');

  // Pending providers
  const [pending, setPending] = useState<Provider[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Flagged content
  const [flagged, setFlagged] = useState<ContentReport[]>([]);
  const [loadingFlagged, setLoadingFlagged] = useState(false);
  const [flaggedLoaded, setFlaggedLoaded] = useState(false);
  const [actingReport, setActingReport] = useState<string | null>(null);
  const [flaggedError, setFlaggedError] = useState('');

  // Listing claims
  const [claims, setClaims] = useState<ListingClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [actingClaim, setActingClaim] = useState<string | null>(null);
  const [claimsError, setClaimsError] = useState('');

  // Community events
  const [pendingEvents, setPendingEvents] = useState<CommunityEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [actingEvent, setActingEvent] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState('');

  useEffect(() => {
    fetchPendingProviders()
      .then(setPending)
      .catch(console.error)
      .finally(() => setLoadingPending(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'flagged' && !flaggedLoaded) {
      setLoadingFlagged(true);
      fetchReports()
        .then(data => { setFlagged(data); setFlaggedLoaded(true); })
        .catch(console.error)
        .finally(() => setLoadingFlagged(false));
    }
  }, [activeTab, flaggedLoaded]);

  useEffect(() => {
    if (activeTab === 'claims' && !claimsLoaded) {
      setLoadingClaims(true);
      fetchPendingClaims()
        .then(data => { setClaims(data); setClaimsLoaded(true); })
        .catch(console.error)
        .finally(() => setLoadingClaims(false));
    }
  }, [activeTab, claimsLoaded]);

  useEffect(() => {
    if (activeTab === 'events' && !eventsLoaded) {
      setLoadingEvents(true);
      fetchPendingCommunityEvents()
        .then(data => { setPendingEvents(data); setEventsLoaded(true); })
        .catch(console.error)
        .finally(() => setLoadingEvents(false));
    }
  }, [activeTab, eventsLoaded]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 font-medium">Access denied.</p>
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await approveProvider(id);
      setPending(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string) => {
    setActing(id);
    try {
      await rejectProvider(id);
      setPending(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setActing(null);
    }
  };

  const handleDismiss = async (reportId: string) => {
    setActingReport(reportId);
    try {
      await dismissReport(reportId);
      setFlagged(prev => prev.filter(r => r.id !== reportId));
    } catch (e: any) {
      setFlaggedError(e.message || 'Failed to dismiss report.');
    } finally {
      setActingReport(null);
    }
  };

  const handleApproveClaim = async (claim: ListingClaim) => {
    setActingClaim(claim.id);
    setClaimsError('');
    try {
      await approveClaim(claim.id, claim.providerId, claim.userId);
      setClaims(prev => prev.filter(c => c.id !== claim.id));
    } catch (e: any) {
      setClaimsError(e.message || 'Failed to approve claim.');
    } finally {
      setActingClaim(null);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    setActingClaim(claimId);
    setClaimsError('');
    try {
      await rejectClaim(claimId);
      setClaims(prev => prev.filter(c => c.id !== claimId));
    } catch (e: any) {
      setClaimsError(e.message || 'Failed to reject claim.');
    } finally {
      setActingClaim(null);
    }
  };

  const handleApproveEvent = async (id: string) => {
    setActingEvent(id);
    setEventsError('');
    try {
      await approveCommunityEvent(id);
      setPendingEvents(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      setEventsError(e.message || 'Failed to approve event.');
    } finally {
      setActingEvent(null);
    }
  };

  const handleRejectEvent = async (id: string) => {
    setActingEvent(id);
    setEventsError('');
    try {
      await rejectCommunityEvent(id);
      setPendingEvents(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      setEventsError(e.message || 'Failed to reject event.');
    } finally {
      setActingEvent(null);
    }
  };

  const handleRemoveContent = async (report: ContentReport) => {
    setActingReport(report.id);
    try {
      await removeContent(report.contentType, report.contentId);
      await dismissReport(report.id);
      setFlagged(prev => prev.filter(r => r.id !== report.id));
    } catch (e: any) {
      setFlaggedError(e.message || 'Failed to remove content.');
    } finally {
      setActingReport(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage submissions and flagged content</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">
              {pending.length} pending
            </span>
          )}
          {flagged.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
              {flagged.length} flagged
            </span>
          )}
          {claims.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              {claims.length} claims
            </span>
          )}
          {pendingEvents.length > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
              {pendingEvents.length} events
            </span>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <i className="fas fa-clock mr-2"></i>
          Pending
          {pending.length > 0 && (
            <span className="ml-2 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pending.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'flagged'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <i className="fas fa-flag mr-2"></i>
          Flagged
          {flagged.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{flagged.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'claims'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <i className="fas fa-store mr-2"></i>
          Claims
          {claims.length > 0 && (
            <span className="ml-2 bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{claims.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'events'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <i className="fas fa-calendar mr-2"></i>
          Events
          {pendingEvents.length > 0 && (
            <span className="ml-2 bg-purple-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingEvents.length}</span>
          )}
        </button>
      </div>

      {/* Pending Providers Tab */}
      {activeTab === 'pending' && (
        loadingPending ? (
          <div className="text-center py-20 text-slate-400 text-sm">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <i className="fas fa-check-circle text-emerald-400 text-3xl mb-3"></i>
            <p className="text-slate-500 font-medium">All caught up — no pending submissions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(p => (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h2 className="font-bold text-slate-900 text-base">{p.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium">{p.category}</span>
                    {p.subcategory && <span className="text-slate-400">{p.subcategory}</span>}
                    <span className="flex items-center gap-1">
                      <i className="fas fa-map-marker-alt text-orange-400"></i> {p.town}
                    </span>
                    {p.phone && <span className="flex items-center gap-1"><i className="fas fa-phone text-slate-300"></i> {p.phone}</span>}
                  </div>
                  <p className="text-slate-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={acting === p.id}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(p.id)}
                    disabled={acting === p.id}
                    className="bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Listing Claims Tab */}
      {activeTab === 'claims' && (
        <>
          {claimsError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              <span>{claimsError}</span>
              <button onClick={() => setClaimsError('')} className="ml-4 font-bold text-lg leading-none">&times;</button>
            </div>
          )}
          {loadingClaims ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading...</div>
          ) : claims.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <i className="fas fa-store text-slate-300 text-3xl mb-3"></i>
              <p className="text-slate-500 font-medium">No pending claim requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map(claim => (
                <div key={claim.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h2 className="font-bold text-slate-900 text-base">{claim.providerName}</h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Claimed by <span className="font-semibold text-slate-700">{claim.userName}</span></span>
                        {claim.userEmail && <span className="text-slate-400">({claim.userEmail})</span>}
                        <span>·</span>
                        <span className="capitalize bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{claim.verificationMethod}</span>
                      </div>
                      {claim.verificationDetail && (
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                          <span className="font-semibold text-slate-400 text-xs uppercase tracking-wide block mb-0.5">Verification detail</span>
                          {claim.verificationDetail}
                        </p>
                      )}
                      <p className="text-slate-400 text-xs">{new Date(claim.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveClaim(claim)}
                        disabled={actingClaim === claim.id}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectClaim(claim.id)}
                        disabled={actingClaim === claim.id}
                        className="bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Community Events Tab */}
      {activeTab === 'events' && (
        <>
          {eventsError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              <span>{eventsError}</span>
              <button onClick={() => setEventsError('')} className="ml-4 font-bold text-lg leading-none">&times;</button>
            </div>
          )}
          {loadingEvents ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading...</div>
          ) : pendingEvents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <i className="fas fa-calendar-check text-emerald-400 text-3xl mb-3"></i>
              <p className="text-slate-500 font-medium">No pending community events.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEvents.map(ev => (
                <div key={ev.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h2 className="font-bold text-slate-900 text-base">{ev.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><i className="fas fa-calendar text-purple-400"></i> {ev.eventDate}</span>
                        <span className="flex items-center gap-1"><i className="fas fa-map-marker-alt text-orange-400"></i> {ev.location}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full">{ev.town}</span>
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">{ev.description}</p>
                      <p className="text-slate-400 text-xs">Submitted by {ev.userName} · {new Date(ev.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveEvent(ev.id)}
                        disabled={actingEvent === ev.id}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectEvent(ev.id)}
                        disabled={actingEvent === ev.id}
                        className="bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Flagged Content Tab */}
      {activeTab === 'flagged' && (
        <>
          {flaggedError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              <span>{flaggedError}</span>
              <button onClick={() => setFlaggedError('')} className="ml-4 font-bold text-lg leading-none">&times;</button>
            </div>
          )}
          {loadingFlagged ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading...</div>
          ) : flagged.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <i className="fas fa-shield-halved text-emerald-400 text-3xl mb-3"></i>
              <p className="text-slate-500 font-medium">No flagged content — community is looking good.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flagged.map(report => (
                <div key={report.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${contentTypeBadge[report.contentType]}`}>
                          {contentTypeLabel[report.contentType]}
                        </span>
                        <h2 className="font-bold text-slate-900 text-sm">{report.contentTitle}</h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        <span>Reported by <span className="font-semibold text-slate-600">{report.reportedByName}</span></span>
                        <span>·</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      {report.reason && (
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                          <span className="font-semibold text-slate-400 text-xs uppercase tracking-wide block mb-0.5">Reason</span>
                          {report.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDismiss(report.id)}
                        disabled={actingReport === report.id}
                        className="bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleRemoveContent(report)}
                        disabled={actingReport === report.id}
                        className="bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        Remove Content
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Admin;
