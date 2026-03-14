
import React, { useEffect, useState } from 'react';
import { Provider, ContentReport, ReportContentType, ListingClaim, CommunityEvent, CommunityAlert, SpotlightBooking, EarlyAccessRequest } from '../types';
import { fetchPendingProviders, approveProvider, rejectProvider, fetchReports, dismissReport, removeContent, fetchPendingClaims, approveClaim, rejectClaim, fetchPendingCommunityEvents, approveCommunityEvent, deleteCommunityEvent, createAlert, dismissAlert, fetchSpotlightBookings, updateSpotlightBookingStatus, deleteSpotlightBooking, updateSpotlightBooking, formatWeekRange, fetchEarlyAccessRequests, updateEarlyAccessStatus, deleteEarlyAccessRequest, fetchActivityFeed, ActivityItem } from '../lib/api';

interface AdminProps {
  user: { id: string; name: string; role?: string } | null;
  communityAlert: CommunityAlert | null;
  setCommunityAlert: (alert: CommunityAlert | null) => void;
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
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

const Admin: React.FC<AdminProps> = ({ user, communityAlert, setCommunityAlert, setProviders }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'flagged' | 'claims' | 'events' | 'alerts' | 'bookings' | 'access' | 'activity'>('pending');

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
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);

  // Spotlight bookings
  const [bookings, setBookings] = useState<SpotlightBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [actingBooking, setActingBooking] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState('');
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [editingBooking, setEditingBooking] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ title: string; description: string; eventDate: string; eventTime: string; tags: string[]; location: string; town: string; weekStart: string; adminNotes: string }>({ title: '', description: '', eventDate: '', eventTime: '', tags: [], location: '', town: '', weekStart: '', adminNotes: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Early access requests
  const [accessRequests, setAccessRequests] = useState<EarlyAccessRequest[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [confirmDeleteAccessId, setConfirmDeleteAccessId] = useState<string | null>(null);

  // Activity feed
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityItem['actionType']>('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Community alerts
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  const [alertActing, setAlertActing] = useState(false);
  const [alertError, setAlertError] = useState('');

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
    if (activeTab === 'bookings' && !bookingsLoaded) {
      setLoadingBookings(true);
      fetchSpotlightBookings()
        .then(data => { setBookings(data); setBookingsLoaded(true); })
        .catch(console.error)
        .finally(() => setLoadingBookings(false));
    }
  }, [activeTab, bookingsLoaded]);

  useEffect(() => {
    if (activeTab === 'events' && !eventsLoaded) {
      setLoadingEvents(true);
      fetchPendingCommunityEvents()
        .then(data => { setPendingEvents(data); setEventsLoaded(true); })
        .catch(console.error)
        .finally(() => setLoadingEvents(false));
    }
  }, [activeTab, eventsLoaded]);

  useEffect(() => {
    if (activeTab === 'access' && !accessLoaded) {
      setLoadingAccess(true);
      fetchEarlyAccessRequests()
        .then(data => { setAccessRequests(data); setAccessLoaded(true); })
        .catch(e => setAccessError(e.message || 'Failed to load requests.'))
        .finally(() => setLoadingAccess(false));
    }
  }, [activeTab, accessLoaded]);

  useEffect(() => {
    if (activeTab === 'activity' && !activityLoaded) {
      setLoadingActivity(true);
      fetchActivityFeed(200)
        .then(data => { setActivity(data); setActivityLoaded(true); })
        .catch(e => setActivityError(e.message || 'Failed to load activity.'))
        .finally(() => setLoadingActivity(false));
    }
  }, [activeTab, activityLoaded]);

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
      await approveClaim(claim.id);
      setClaims(prev => prev.filter(c => c.id !== claim.id));
      setProviders(prev => prev.map(p => p.id === claim.providerId
        ? { ...p, claimStatus: 'claimed' as const, claimedBy: claim.userId }
        : p
      ));
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

  const handleDeleteEventAdmin = async (id: string) => {
    setActingEvent(id);
    setEventsError('');
    try {
      await deleteCommunityEvent(id);
      setPendingEvents(prev => prev.filter(e => e.id !== id));
      setConfirmDeleteEventId(null);
    } catch (e: any) {
      setEventsError(e.message || 'Failed to delete post.');
    } finally {
      setActingEvent(null);
    }
  };


  const handlePostAlert = async () => {
    if (!alertTitle.trim() || !alertDescription.trim() || !user) return;
    setAlertActing(true);
    setAlertError('');
    try {
      if (communityAlert) await dismissAlert(communityAlert.id);
      const newAlert = await createAlert(alertTitle.trim(), alertDescription.trim(), user.id);
      setCommunityAlert(newAlert);
      setAlertTitle('');
      setAlertDescription('');
    } catch (e: any) {
      setAlertError(e.message || 'Failed to post alert.');
    } finally {
      setAlertActing(false);
    }
  };

  const handleDismissAlert = async () => {
    if (!communityAlert) return;
    setAlertActing(true);
    setAlertError('');
    try {
      await dismissAlert(communityAlert.id);
      setCommunityAlert(null);
    } catch (e: any) {
      setAlertError(e.message || 'Failed to dismiss alert.');
    } finally {
      setAlertActing(false);
    }
  };

  const handleApproveBooking = async (id: string) => {
    setActingBooking(id);
    setBookingsError('');
    try {
      await updateSpotlightBookingStatus(id, 'approved');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'approved' } : b));
    } catch (e: any) {
      setBookingsError(e.message || 'Failed to approve booking.');
    } finally {
      setActingBooking(null);
    }
  };

  const handleRejectBooking = async (id: string) => {
    setActingBooking(id);
    setBookingsError('');
    try {
      await updateSpotlightBookingStatus(id, 'rejected', rejectNotes[id] || undefined);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected' } : b));
    } catch (e: any) {
      setBookingsError(e.message || 'Failed to reject booking.');
    } finally {
      setActingBooking(null);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setActingBooking(id);
    setBookingsError('');
    try {
      await deleteSpotlightBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (e: any) {
      setBookingsError(e.message || 'Failed to delete booking.');
    } finally {
      setActingBooking(null);
    }
  };

  const handleStartEdit = (b: SpotlightBooking) => {
    setEditingBooking(b.id);
    setEditFields({
      title: b.title,
      description: b.description,
      eventDate: b.eventDate ?? '',
      eventTime: b.eventTime ?? '',
      tags: b.tags ?? [],
      location: b.location ?? '',
      town: b.town ?? '',
      weekStart: b.weekStart,
      adminNotes: b.adminNotes ?? '',
    });
  };

  const handleSaveEdit = async (id: string) => {
    setActingBooking(id);
    setBookingsError('');
    try {
      const updated = await updateSpotlightBooking(id, {
        title: editFields.title,
        description: editFields.description,
        eventDate: editFields.eventDate,
        eventTime: editFields.eventTime,
        tags: editFields.tags,
        location: editFields.location,
        town: editFields.town,
        weekStart: editFields.weekStart,
        adminNotes: editFields.adminNotes,
      });
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
      setEditingBooking(null);
    } catch (e: any) {
      setBookingsError(e.message || 'Failed to save changes.');
    } finally {
      setActingBooking(null);
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
    <div className="max-w-5xl mx-auto pb-10 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage submissions and flagged content</p>
        <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
          {pending.length > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {pending.length} pending
            </span>
          )}
          {flagged.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {flagged.length} flagged
            </span>
          )}
          {claims.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {claims.length} claims
            </span>
          )}
          {pendingEvents.length > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingEvents.length} events
            </span>
          )}
          {communityAlert && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
              1 alert live
            </span>
          )}
        </div>
      </div>

      {/* Tab nav — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex justify-center gap-1 bg-slate-100 p-1 rounded-2xl w-max min-w-full mx-auto">
          {([
            { key: 'pending', icon: 'fa-clock', label: 'Pending', badge: pending.length, badgeColor: 'bg-orange-500' },
            { key: 'flagged', icon: 'fa-flag', label: 'Flagged', badge: flagged.length, badgeColor: 'bg-red-500' },
            { key: 'claims', icon: 'fa-store', label: 'Claims', badge: claims.length, badgeColor: 'bg-blue-500' },
            { key: 'events', icon: 'fa-calendar', label: 'Events', badge: pendingEvents.length, badgeColor: 'bg-purple-500' },
            { key: 'alerts', icon: 'fa-triangle-exclamation', label: 'Alerts', badge: communityAlert ? 1 : 0, badgeColor: 'bg-red-500' },
            { key: 'bookings', icon: 'fa-star', label: 'Bookings', badge: bookings.filter(b => b.status === 'pending_review').length, badgeColor: 'bg-amber-500' },
            { key: 'access', icon: 'fa-bolt', label: 'Early Access', badge: accessRequests.filter(r => r.status === 'pending').length, badgeColor: 'bg-amber-500' },
            { key: 'activity', icon: 'fa-clock-rotate-left', label: 'Activity', badge: 0, badgeColor: '' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className={`fas ${tab.icon} mr-1.5`}></i>
              {tab.label}
              {tab.badge > 0 && (
                <span className={`ml-1.5 ${tab.badgeColor} text-white text-[10px] font-black px-1.5 py-0.5 rounded-full`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
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
                      {claim.proofUrl && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                          <span className="font-semibold text-slate-400 text-xs uppercase tracking-wide block">
                            Proof — {claim.proofType === 'storefront' ? 'Storefront photo' : claim.proofType === 'google_facebook' ? 'Google/Facebook screenshot' : claim.proofType === 'business_card' ? 'Business card' : 'Document'}
                          </span>
                          <a href={claim.proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={claim.proofUrl} alt="Ownership proof" className="max-h-40 rounded-lg border border-slate-200 object-contain bg-white" />
                          </a>
                          <a href={claim.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <i className="fas fa-external-link-alt text-[10px]"></i> Open full size
                          </a>
                        </div>
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
              <p className="text-slate-500 font-medium">No flagged community events.</p>
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
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 break-words whitespace-pre-wrap">{ev.description}</p>
                      <p className="text-slate-400 text-xs">Submitted by {ev.userName} · {new Date(ev.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveEvent(ev.id)}
                        disabled={actingEvent === ev.id}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Restore
                      </button>
                      {confirmDeleteEventId === ev.id ? (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs text-slate-500 text-center">Delete this post?</p>
                          <button
                            onClick={() => handleDeleteEventAdmin(ev.id)}
                            disabled={actingEvent === ev.id}
                            className="bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteEventId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 text-center"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteEventId(ev.id)}
                          disabled={actingEvent === ev.id}
                          className="bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Community Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alertError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              <span>{alertError}</span>
              <button onClick={() => setAlertError('')} className="ml-4 font-bold text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Current active alert */}
          {communityAlert ? (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-red-100 text-red-700">🚨 Live Alert</span>
                    <span className="text-xs text-slate-400">{new Date(communityAlert.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h2 className="font-bold text-slate-900 text-base">{communityAlert.title}</h2>
                  <p className="text-slate-600 text-sm">{communityAlert.description}</p>
                </div>
                <button
                  onClick={handleDismissAlert}
                  disabled={alertActing}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  Dismiss Alert
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex items-center gap-3 text-slate-400 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
              No active alert. Community is all clear.
            </div>
          )}

          {/* Post new alert form */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">{communityAlert ? 'Replace Alert' : 'Post New Alert'}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Alert title (e.g. Boil Water Advisory)"
                value={alertTitle}
                onChange={e => setAlertTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <textarea
                placeholder="Details (e.g. Affects downtown area through Friday. Do not drink tap water.)"
                value={alertDescription}
                onChange={e => setAlertDescription(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            <button
              onClick={handlePostAlert}
              disabled={alertActing || !alertTitle.trim() || !alertDescription.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {alertActing ? 'Posting...' : '🚨 Post Alert'}
            </button>
          </div>
        </div>
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

      {/* Spotlight Bookings Tab */}
      {activeTab === 'bookings' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-slate-900">Spotlight & Featured Bookings</h2>
            <button onClick={() => { setBookingsLoaded(false); }} className="text-xs text-slate-400 hover:text-slate-600">
              <i className="fas fa-refresh mr-1"></i> Refresh
            </button>
          </div>
          {bookingsError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">{bookingsError}</div>}
          {loadingBookings ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-sm">
              No bookings yet.
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(b => (
                <div key={b.id} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-3 ${
                  b.status === 'approved' ? 'border-emerald-200' :
                  b.status === 'rejected' ? 'border-slate-100 opacity-60' :
                  'border-amber-200'
                }`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
                        b.type === 'spotlight' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {b.type === 'spotlight' ? '⭐ Spotlight' : '📣 Featured'}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        b.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {b.status === 'pending_review' ? 'Pending Review' : b.status}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
                        b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {b.paymentStatus === 'paid' ? '$ Paid' : '$ Unpaid'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      Week of {formatWeekRange(new Date(b.weekStart + 'T00:00:00'))}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm break-words">{b.title}</h3>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed break-words">{b.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {b.eventDate && <span><i className="fas fa-calendar mr-1"></i>{b.eventDate}</span>}
                    {b.eventTime && <span><i className="fas fa-clock mr-1"></i>{b.eventTime}</span>}
                    {b.location && <span><i className="fas fa-map-marker-alt mr-1"></i>{b.location}</span>}
                    {b.town && <span><i className="fas fa-city mr-1"></i>{b.town}</span>}
                  </div>
                  {b.tags && b.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {b.tags.map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}

                  {b.imageUrl && (
                    <img src={b.imageUrl} alt="" className="w-full h-28 object-cover rounded-xl border border-slate-100" />
                  )}

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p><strong>Contact:</strong> {b.contactName} · {b.contactEmail}{b.contactPhone ? ` · ${b.contactPhone}` : ''}</p>
                    {b.submittedByName && <p><strong>Account:</strong> {b.submittedByName}{b.submittedBy ? <span className="text-slate-300 ml-1 font-mono">{b.submittedBy.slice(0, 8)}…</span> : null}</p>}
                    {b.stripeSessionId && <p className="text-slate-400"><strong>Stripe session:</strong> <span className="font-mono">{b.stripeSessionId}</span></p>}
                  </div>

                  {b.adminNotes && (
                    <p className="text-xs text-slate-400 italic">Admin note: {b.adminNotes}</p>
                  )}

                  {editingBooking === b.id ? (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edit Booking</p>
                      <input type="text" placeholder="Title" value={editFields.title} onChange={e => setEditFields(f => ({ ...f, title: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300" />
                      <textarea rows={2} placeholder="Description" value={editFields.description} onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" placeholder="Event date" value={editFields.eventDate} onChange={e => setEditFields(f => ({ ...f, eventDate: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="text" placeholder="Event time (e.g. 4:30 – 6:30 PM)" value={editFields.eventTime} onChange={e => setEditFields(f => ({ ...f, eventTime: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="date" placeholder="Week start" value={editFields.weekStart} onChange={e => setEditFields(f => ({ ...f, weekStart: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="text" placeholder="Location" value={editFields.location} onChange={e => setEditFields(f => ({ ...f, location: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="text" placeholder="Town" value={editFields.town} onChange={e => setEditFields(f => ({ ...f, town: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Free Admission', 'All Ages Welcome', 'Family Friendly', 'Community Event', 'Live Music', 'Food & Drinks', 'Outdoor Event', 'Fundraiser', 'Grand Opening', 'Business Event'].map(tag => {
                            const active = editFields.tags.includes(tag);
                            return (
                              <button key={tag} type="button" onClick={() => setEditFields(f => ({ ...f, tags: active ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${active ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <input type="text" placeholder="Admin notes" value={editFields.adminNotes} onChange={e => setEditFields(f => ({ ...f, adminNotes: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300" />
                      <div className="flex gap-2">
                        <button disabled={actingBooking === b.id} onClick={() => handleSaveEdit(b.id)} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors">
                          {actingBooking === b.id ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={() => setEditingBooking(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-xl transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {b.status === 'pending_review' && (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            placeholder="Rejection reason (optional)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-red-300"
                            value={rejectNotes[b.id] ?? ''}
                            onChange={e => setRejectNotes(prev => ({ ...prev, [b.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={actingBooking === b.id}
                              onClick={() => handleApproveBooking(b.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                            >
                              {actingBooking === b.id ? 'Working...' : 'Approve & Publish'}
                            </button>
                            <button
                              disabled={actingBooking === b.id}
                              onClick={() => handleRejectBooking(b.id)}
                              className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-xs font-bold py-2 rounded-xl border border-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => handleStartEdit(b)}
                          className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold py-2 rounded-xl transition-colors"
                        >
                          <i className="fas fa-pencil mr-1.5"></i>Edit
                        </button>
                        <button
                          disabled={actingBooking === b.id}
                          onClick={() => handleDeleteBooking(b.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-xs font-bold py-2 rounded-xl transition-colors"
                        >
                          <i className="fas fa-trash mr-1.5"></i>Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-trash text-red-600"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Booking</h3>
                <p className="text-slate-500 text-sm">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Access Requests Tab */}
      {activeTab === 'access' && (
        <>
          {accessError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              <span>{accessError}</span>
              <button onClick={() => setAccessError('')} className="ml-4 font-bold text-lg leading-none">&times;</button>
            </div>
          )}
          {loadingAccess ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading...</div>
          ) : accessRequests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <i className="fas fa-bolt text-amber-400 text-3xl mb-3"></i>
              <p className="text-slate-500 font-medium">No early access requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accessRequests.map((req, i) => (
                <div key={req.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">#{i + 1} in queue</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : req.status === 'contacted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {req.status === 'pending' ? 'New' : req.status === 'contacted' ? 'Contacted' : 'Approved'}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{req.providerName}</h3>
                      <p className="text-xs text-slate-500">{req.category}</p>
                      <p className="text-xs text-slate-400">Requested by {req.userName}</p>
                      {req.contactEmail && (
                        <p className="text-xs text-slate-500"><i className="fas fa-envelope text-slate-300 mr-1"></i>{req.contactEmail}</p>
                      )}
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        <i className="fas fa-clock text-slate-300 mr-1"></i>
                        {new Date(req.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {req.status !== 'contacted' && (
                        <button
                          onClick={async () => { await updateEarlyAccessStatus(req.id, 'contacted'); setAccessRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'contacted' } : r)); }}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                        >
                          Mark Contacted
                        </button>
                      )}
                      {req.status !== 'approved' ? (
                        <button
                          onClick={async () => {
                            await updateEarlyAccessStatus(req.id, 'approved', req.providerId);
                            setAccessRequests((prev: EarlyAccessRequest[]) => prev.map((r: EarlyAccessRequest) => r.id === req.id ? { ...r, status: 'approved' } : r));
                            setProviders((prev: Provider[]) => prev.map((p: Provider) => p.id === req.providerId ? { ...p, listingTier: 'featured' as const } : p));
                          }}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await updateEarlyAccessStatus(req.id, 'approved', req.providerId);
                            setProviders((prev: Provider[]) => prev.map((p: Provider) => p.id === req.providerId ? { ...p, listingTier: 'featured' as const } : p));
                          }}
                          className="bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                        >
                          Re-apply tier
                        </button>
                      )}
                      {confirmDeleteAccessId === req.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={async () => { await deleteEarlyAccessRequest(req.id); setAccessRequests((prev: EarlyAccessRequest[]) => prev.filter((r: EarlyAccessRequest) => r.id !== req.id)); setConfirmDeleteAccessId(null); }}
                            className="bg-red-600 text-white hover:bg-red-700 font-bold text-xs px-3 py-2 rounded-xl transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteAccessId(null)}
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteAccessId(req.id)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activeTab === 'activity' && (() => {
        const actionLabels: Record<ActivityItem['actionType'], string> = {
          review: 'Review',
          claim: 'Claim',
          report: 'Report',
          event: 'Event',
          lost_found: 'Lost & Found',
          early_access: 'Early Access',
        };
        const actionIcons: Record<ActivityItem['actionType'], string> = {
          review: 'fa-star',
          claim: 'fa-store',
          report: 'fa-flag',
          event: 'fa-calendar',
          lost_found: 'fa-paw',
          early_access: 'fa-bolt',
        };
        const filtered = activity
          .filter((item: ActivityItem) => activityFilter === 'all' || item.actionType === activityFilter)
          .filter((item: ActivityItem) => {
            if (!activitySearch.trim()) return true;
            const q = activitySearch.toLowerCase();
            return (
              item.userName.toLowerCase().includes(q) ||
              item.summary.toLowerCase().includes(q) ||
              (item.detail ?? '').toLowerCase().includes(q)
            );
          });

        return (
          <>
            {activityError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
                <span>{activityError}</span>
                <button onClick={() => setActivityError('')} className="ml-4 font-bold text-lg leading-none">&times;</button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Search by user or content…"
                value={activitySearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActivitySearch(e.target.value)}
                className="flex-1 min-w-[180px] text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <select
                value={activityFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActivityFilter(e.target.value as typeof activityFilter)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">All actions</option>
                {(Object.keys(actionLabels) as ActivityItem['actionType'][]).map(k => (
                  <option key={k} value={k}>{actionLabels[k]}</option>
                ))}
              </select>
              {activityLoaded && (
                <button
                  onClick={() => { setActivityLoaded(false); setActivity([]); setActivityError(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2"
                >
                  <i className="fas fa-rotate-right mr-1"></i>Refresh
                </button>
              )}
            </div>

            {loadingActivity ? (
              <div className="text-center py-20 text-slate-400 text-sm">Loading activity…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <i className="fas fa-clock-rotate-left text-slate-300 text-3xl mb-3"></i>
                <p className="text-slate-500 font-medium">No activity found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((item: ActivityItem) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className={`fas ${actionIcons[item.actionType]} text-slate-400 text-xs`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{item.userName}</span>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">
                          {new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{item.summary}</p>
                      {item.detail && (
                        <p className="text-xs text-slate-400 mt-0.5 italic truncate">"{item.detail}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};

export default Admin;
