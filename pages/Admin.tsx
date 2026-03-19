
import React, { useEffect, useState } from 'react';
import { ContentReport, ReportContentType, ListingClaim, CommunityEvent, CommunityAlert, SpotlightBooking, EarlyAccessRequest } from '../types';
import { fetchPendingProviders, approveProvider, rejectProvider, fetchReports, dismissReport, removeContent, fetchPendingClaims, approveClaim, rejectClaim, fetchPendingCommunityEvents, approveCommunityEvent, deleteCommunityEvent, adminCreateCommunityEvent, adminCreateLostFoundPost, adminCreateAskPost, createAlert, dismissAlert, reorderAlerts, fetchSpotlightBookings, updateSpotlightBookingStatus, deleteSpotlightBooking, updateSpotlightBooking, formatWeekRange, fetchEarlyAccessRequests, updateEarlyAccessStatus, deleteEarlyAccessRequest, fetchActivityFeed, ActivityItem, submitSpotlightBooking, uploadSpotlightImage } from '../lib/api';
import type { CommunityPostType, LostFoundType } from '../types';
import { getCurrentTenant } from '../tenants';

const adminTenant = getCurrentTenant();

interface AdminProps {
  user: { id: string; name: string; role?: string } | null;
  communityAlerts: CommunityAlert[];
  setCommunityAlerts: React.Dispatch<React.SetStateAction<CommunityAlert[]>>;
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

const Admin: React.FC<AdminProps> = ({ user, communityAlerts, setCommunityAlerts }) => {
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

  // Admin create community event
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [cePostType, setCePostType] = useState<CommunityPostType>('event');
  const [ceTitle, setCeTitle] = useState('');
  const [ceDesc, setCeDesc] = useState('');
  const [ceDate, setCeDate] = useState('');
  const [ceNoDate, setCeNoDate] = useState(false);
  const [ceLocation, setCeLocation] = useState('');
  const [ceTown, setCeTown] = useState('');
  const [ceSubmitting, setCeSubmitting] = useState(false);
  const [ceError, setCeError] = useState('');
  const [ceSuccess, setCeSuccess] = useState('');

  // Admin create type selector (community / lost-found / ask)
  const [createFormType, setCreateFormType] = useState<'community' | 'lostfound' | 'ask'>('community');

  // Admin create lost & found
  const [lfType, setLfType] = useState<LostFoundType>('lost_item');
  const [lfTitle, setLfTitle] = useState('');
  const [lfDesc, setLfDesc] = useState('');
  const [lfLocation, setLfLocation] = useState('');
  const [lfTown, setLfTown] = useState('');
  const [lfDate, setLfDate] = useState('');
  const [lfContact, setLfContact] = useState('');
  const [lfPhoto, setLfPhoto] = useState<File | null>(null);
  const [lfSubmitting, setLfSubmitting] = useState(false);
  const [lfError, setLfError] = useState('');

  // Admin create ask post
  const [askTitle, setAskTitle] = useState('');
  const [askDesc, setAskDesc] = useState('');
  const [askTown, setAskTown] = useState('');
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [askError, setAskError] = useState('');

  // Spotlight bookings
  const [bookings, setBookings] = useState<SpotlightBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [actingBooking, setActingBooking] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState('');
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [editingBooking, setEditingBooking] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ title: string; description: string; eventDate: string; eventTime: string; tags: string[]; location: string; town: string; weekStart: string; adminNotes: string; imageUrl: string; thumbnailUrl: string; flyerUrl: string }>({ title: '', description: '', eventDate: '', eventTime: '', tags: [], location: '', town: '', weekStart: '', adminNotes: '', imageUrl: '', thumbnailUrl: '', flyerUrl: '' });
  const [editBanner, setEditBanner] = useState<File | null>(null);
  const [editThumb, setEditThumb] = useState<File | null>(null);
  const [editFlyer, setEditFlyer] = useState<File | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Admin create spotlight/featured
  const [showAdminCreate, setShowAdminCreate] = useState(false);
  const [adminCreateType, setAdminCreateType] = useState<'spotlight' | 'featured'>('spotlight');
  const [acTitle, setAcTitle] = useState('');
  const [acTeaser, setAcTeaser] = useState('');
  const [acDesc, setAcDesc] = useState('');
  const [acEventDate, setAcEventDate] = useState('');
  const [acEventTime, setAcEventTime] = useState('');
  const [acLocation, setAcLocation] = useState('');
  const [acTown, setAcTown] = useState('');
  const [acWeekStart, setAcWeekStart] = useState('');
  const [acTags, setAcTags] = useState<string[]>([]);
  const [acBanner, setAcBanner] = useState<File | null>(null);
  const [acThumb, setAcThumb] = useState<File | null>(null);
  const [acFlyer, setAcFlyer] = useState<File | null>(null);
  const [acSubmitting, setAcSubmitting] = useState(false);
  const [acError, setAcError] = useState('');

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
  const [alertIcon, setAlertIcon] = useState('fa-triangle-exclamation');
  const [alertActing, setAlertActing] = useState(false);
  const [alertError, setAlertError] = useState('');
  const alertFormRef = React.useRef<HTMLDivElement>(null);
  const [showAlertConfirm, setShowAlertConfirm] = useState(false);
  const [alertChecks, setAlertChecks] = useState([false, false, false]);

  const ALERT_ICONS = [
    { id: 'fa-triangle-exclamation', label: 'Warning',      color: 'text-amber-500' },
    { id: 'fa-bell',                  label: 'General',      color: 'text-slate-500' },
    { id: 'fa-bullhorn',              label: 'Announcement', color: 'text-blue-500'  },
    { id: 'fa-cloud-bolt',            label: 'Weather',      color: 'text-indigo-500'},
    { id: 'fa-droplet',               label: 'Water',        color: 'text-cyan-500'  },
    { id: 'fa-fire',                  label: 'Fire',         color: 'text-orange-500'},
    { id: 'fa-road-barrier',          label: 'Road',         color: 'text-yellow-600'},
    { id: 'fa-house-flood-water',     label: 'Flood',        color: 'text-teal-500'  },
  ];

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
    free_item: 'bg-green-50 text-green-600 border-green-200',
    prayer_request: 'bg-violet-50 text-violet-700 border-violet-100',
    other: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const handleAdminCreateEvent = async () => {
    if (!ceTitle.trim() || !ceDesc.trim() || !user) return;
    setCeSubmitting(true);
    setCeError('');
    try {
      const finalDate = ceNoDate ? '' : ceDate;
      await adminCreateCommunityEvent(ceTitle, ceDesc, finalDate, ceLocation, ceTown, cePostType);
      setCeTitle(''); setCeDesc(''); setCeDate(''); setCeNoDate(false); setCeLocation(''); setCeTown(''); setCePostType('event');
      setShowCreateEvent(false);
      setCeSuccess('Post created and published!');
      setTimeout(() => setCeSuccess(''), 4000);
    } catch (e: any) {
      setCeError(e.message || 'Failed to create post.');
    } finally {
      setCeSubmitting(false);
    }
  };

  const handleAdminCreateLF = async () => {
    if (!lfTitle.trim() || !lfDesc.trim() || !user) return;
    setLfSubmitting(true);
    setLfError('');
    try {
      await adminCreateLostFoundPost({
        type: lfType,
        title: lfTitle,
        description: lfDesc,
        locationDescription: lfLocation,
        town: lfTown,
        dateOccurred: lfDate || new Date().toISOString().split('T')[0],
        contactMethod: lfContact,
      }, lfPhoto);
      setLfTitle(''); setLfDesc(''); setLfLocation(''); setLfTown(''); setLfDate(''); setLfContact(''); setLfPhoto(null); setLfType('lost_item');
      setShowCreateEvent(false);
      setCeSuccess('Lost & Found post created!');
      setTimeout(() => setCeSuccess(''), 4000);
    } catch (e: any) {
      setLfError(e.message || 'Failed to create post.');
    } finally {
      setLfSubmitting(false);
    }
  };

  const handleAdminCreateAsk = async () => {
    if (!askTitle.trim() || !user) return;
    setAskSubmitting(true);
    setAskError('');
    try {
      await adminCreateAskPost({ serviceNeeded: askTitle, description: askDesc, town: askTown });
      setAskTitle(''); setAskDesc(''); setAskTown('');
      setShowCreateEvent(false);
      setCeSuccess('Ask post created!');
      setTimeout(() => setCeSuccess(''), 4000);
    } catch (e: any) {
      setAskError(e.message || 'Failed to create post.');
    } finally {
      setAskSubmitting(false);
    }
  };

  const handleAdminCreateBooking = async () => {
    if (!acTitle.trim() || !acDesc.trim() || !acWeekStart || !user) return;
    setAcSubmitting(true);
    setAcError('');
    try {
      let imageUrl = '';
      let thumbnailUrl: string | undefined;
      let flyerUrl: string | undefined;
      if (adminCreateType === 'featured') {
        // Featured gets one 3:4 image used as both card image and flyer
        if (acFlyer) {
          const url = await uploadSpotlightImage(acFlyer);
          imageUrl = url;
          flyerUrl = url;
        }
      } else {
        if (acBanner) imageUrl = await uploadSpotlightImage(acBanner);
        if (acThumb) thumbnailUrl = await uploadSpotlightImage(acThumb);
        if (acFlyer) flyerUrl = await uploadSpotlightImage(acFlyer);
      }

      const booking = await submitSpotlightBooking(
        adminCreateType,
        acTitle.trim(),
        acDesc.trim(),
        acWeekStart,
        acEventDate || '',
        acEventTime || '',
        acLocation.trim(),
        acTown,
        user.name,
        user.email || '',
        '',
        imageUrl,
        thumbnailUrl,
        flyerUrl,
        acTags.length > 0 ? acTags : undefined,
        adminCreateType === 'spotlight' ? acTeaser.trim() || undefined : undefined,
        undefined,
        'unpaid',
      );
      setBookings(prev => [booking, ...prev]);
      // Reset form
      setAcTitle(''); setAcTeaser(''); setAcDesc(''); setAcEventDate(''); setAcEventTime('');
      setAcLocation(''); setAcTown(''); setAcWeekStart(''); setAcTags([]);
      setAcBanner(null); setAcThumb(null); setAcFlyer(null);
      setShowAdminCreate(false);
    } catch (e: any) {
      setAcError(e.message || 'Failed to create booking.');
    } finally {
      setAcSubmitting(false);
    }
  };

  const handlePostAlert = async () => {
    if (!alertTitle.trim() || !alertDescription.trim() || !user) return;
    setAlertActing(true);
    setAlertError('');
    try {
      const newAlert = await createAlert(alertTitle.trim(), alertDescription.trim(), user.id, alertIcon);
      setCommunityAlerts(prev => [newAlert, ...prev]);
      setAlertTitle('');
      setAlertDescription('');
      setAlertIcon('fa-triangle-exclamation');
    } catch (e: any) {
      setAlertError(e.message || 'Failed to post alert.');
    } finally {
      setAlertActing(false);
    }
  };

  const handleMoveAlert = async (index: number, direction: 'up' | 'down') => {
    const newAlerts = [...communityAlerts];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newAlerts.length) return;
    [newAlerts[index], newAlerts[swapIndex]] = [newAlerts[swapIndex], newAlerts[index]];
    setCommunityAlerts(newAlerts);
    await reorderAlerts(newAlerts.map(a => a.id));
  };

  const handleDismissAlert = async (id: string) => {
    setAlertActing(true);
    setAlertError('');
    try {
      await dismissAlert(id);
      setCommunityAlerts(prev => prev.filter(a => a.id !== id));
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
      imageUrl: b.imageUrl ?? '',
      thumbnailUrl: b.thumbnailUrl ?? '',
      flyerUrl: b.flyerUrl ?? '',
    });
    setEditBanner(null);
    setEditThumb(null);
    setEditFlyer(null);
  };

  const handleSaveEdit = async (id: string) => {
    setActingBooking(id);
    setBookingsError('');
    try {
      let imageUrl = editFields.imageUrl;
      let thumbnailUrl = editFields.thumbnailUrl;
      let flyerUrl = editFields.flyerUrl;
      if (editBanner) imageUrl = await uploadSpotlightImage(editBanner);
      if (editThumb) thumbnailUrl = await uploadSpotlightImage(editThumb);
      if (editFlyer) flyerUrl = await uploadSpotlightImage(editFlyer);
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
        imageUrl,
        thumbnailUrl,
        flyerUrl,
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
          {communityAlerts.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {communityAlerts.length} alert{communityAlerts.length > 1 ? 's' : ''} live
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
            { key: 'alerts', icon: 'fa-triangle-exclamation', label: 'Alerts', badge: communityAlerts.length, badgeColor: 'bg-red-500' },
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
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <h2 className="font-bold text-slate-900 text-base">{claim.providerName}</h2>
                      <p className="text-xs text-slate-500">Requested by <span className="font-semibold text-slate-700">{claim.userName}</span></p>
                      {claim.userEmail && (
                        <p className="text-xs text-slate-500"><i className="fas fa-lock text-[10px] text-slate-300 mr-1"></i>Account email: <span className="font-semibold text-slate-700">{claim.userEmail}</span></p>
                      )}
                      {claim.verificationDetail && (
                        <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 whitespace-pre-line">
                          {claim.verificationDetail}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Flagged Events</h2>
            <button onClick={() => setShowCreateEvent(v => !v)} className="text-xs font-bold text-blue-600 hover:text-blue-500">
              <i className={`fas ${showCreateEvent ? 'fa-minus' : 'fa-plus'} mr-1`}></i> {showCreateEvent ? 'Close' : 'Create Post'}
            </button>
          </div>

          {/* Admin Create Post Form */}
          {showCreateEvent && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Create Post</h3>
              <p className="text-xs text-slate-400">Posts created here are published instantly (no approval needed).</p>

              {/* Form type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What to Create</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'community' as const, label: 'Community Post', icon: 'fa-calendar' },
                    { key: 'lostfound' as const, label: 'Lost & Found', icon: 'fa-magnifying-glass' },
                    { key: 'ask' as const, label: 'Ask Post', icon: 'fa-comments' },
                  ]).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCreateFormType(opt.key)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${createFormType === opt.key ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <i className={`fas ${opt.icon} mr-1`}></i> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Community Post Form ── */}
              {createFormType === 'community' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Post Type</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(POST_TYPE_LABELS) as [CommunityPostType, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCePostType(value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${cePostType === value ? POST_TYPE_COLORS[value] + ' shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Post Title *</label>
                    <input type="text" value={ceTitle} onChange={e => setCeTitle(e.target.value)} maxLength={200} placeholder="e.g. Church Clothes Closet, Town Meeting, Free Dinner" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Date</label>
                        <button type="button" onClick={() => { setCeNoDate(false); setCeDate(new Date().toISOString().split('T')[0]); }} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide">Today</button>
                      </div>
                      <input type="date" disabled={ceNoDate} value={ceNoDate ? '' : ceDate} onChange={e => setCeDate(e.target.value)} className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${ceNoDate ? 'opacity-40' : ''}`} />
                      <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                        <input type="checkbox" checked={ceNoDate} onChange={e => { setCeNoDate(e.target.checked); if (e.target.checked) setCeDate(''); }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                        <span className="text-[11px] text-slate-400">No specific date</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
                      <select value={ceTown} onChange={e => setCeTown(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select...</option>
                        {adminTenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location <span className="font-normal normal-case text-slate-300">(optional)</span></label>
                      <input type="text" value={ceLocation} onChange={e => setCeLocation(e.target.value)} maxLength={300} placeholder="e.g. Clarkson Baptist Church" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Description *</label>
                      <span className={`text-xs ${ceDesc.length > 950 ? 'text-red-400' : 'text-slate-300'}`}>{ceDesc.length}/1000</span>
                    </div>
                    <textarea value={ceDesc} onChange={e => setCeDesc(e.target.value)} maxLength={1000} rows={6} placeholder="Full details — hours, schedules, contact info, etc." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                  </div>

                  {ceError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">{ceError}</div>}

                  <div className="flex gap-3">
                    <button onClick={() => setShowCreateEvent(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleAdminCreateEvent} disabled={ceSubmitting || !ceTitle.trim() || !ceDesc.trim()} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50">
                      {ceSubmitting ? 'Creating...' : 'Publish Post'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Lost & Found Form ── */}
              {createFormType === 'lostfound' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Type</label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 'lost_pet' as const, label: 'Lost Pet' },
                        { value: 'found_pet' as const, label: 'Found Pet' },
                        { value: 'lost_item' as const, label: 'Lost Item' },
                        { value: 'found_item' as const, label: 'Found Item' },
                        { value: 'lost_package' as const, label: 'Lost Package' },
                        { value: 'found_package' as const, label: 'Found Package' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setLfType(opt.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${lfType === opt.value ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Title *</label>
                    <input type="text" value={lfTitle} onChange={e => setLfTitle(e.target.value)} maxLength={200} placeholder="e.g. Lost golden retriever, Found set of keys" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
                      <select value={lfTown} onChange={e => setLfTown(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Select...</option>
                        {adminTenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location <span className="font-normal normal-case text-slate-300">(optional)</span></label>
                      <input type="text" value={lfLocation} onChange={e => setLfLocation(e.target.value)} maxLength={500} placeholder="e.g. Near Main St park" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date Occurred</label>
                      <input type="date" value={lfDate} onChange={e => setLfDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Method <span className="font-normal normal-case text-slate-300">(optional)</span></label>
                    <input type="text" value={lfContact} onChange={e => setLfContact(e.target.value)} maxLength={200} placeholder="e.g. Call 555-1234 or message on Facebook" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Description *</label>
                      <span className={`text-xs ${lfDesc.length > 1900 ? 'text-red-400' : 'text-slate-300'}`}>{lfDesc.length}/2000</span>
                    </div>
                    <textarea value={lfDesc} onChange={e => setLfDesc(e.target.value)} maxLength={2000} rows={5} placeholder="Describe what was lost/found, any identifying features, etc." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Photo <span className="font-normal normal-case text-slate-300">(optional)</span></label>
                    <input type="file" accept="image/*" onChange={e => setLfPhoto(e.target.files?.[0] ?? null)} className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                  </div>

                  {lfError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">{lfError}</div>}

                  <div className="flex gap-3">
                    <button onClick={() => setShowCreateEvent(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleAdminCreateLF} disabled={lfSubmitting || !lfTitle.trim() || !lfDesc.trim()} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors disabled:opacity-50">
                      {lfSubmitting ? 'Creating...' : 'Publish Post'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Ask Post Form ── */}
              {createFormType === 'ask' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Question / Service Needed *</label>
                    <input type="text" value={askTitle} onChange={e => setAskTitle(e.target.value)} maxLength={200} placeholder="e.g. Plumber for kitchen leak, Who mows lawns in Leitchfield?" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
                    <select value={askTown} onChange={e => setAskTown(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">Select...</option>
                      {adminTenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Details <span className="font-normal normal-case text-slate-300">(optional)</span></label>
                      <span className={`text-xs ${askDesc.length > 950 ? 'text-red-400' : 'text-slate-300'}`}>{askDesc.length}/1000</span>
                    </div>
                    <textarea value={askDesc} onChange={e => setAskDesc(e.target.value)} maxLength={1000} rows={4} placeholder="Any extra details about what you're looking for..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
                  </div>

                  {askError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">{askError}</div>}

                  <div className="flex gap-3">
                    <button onClick={() => setShowCreateEvent(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleAdminCreateAsk} disabled={askSubmitting || !askTitle.trim()} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-50">
                      {askSubmitting ? 'Creating...' : 'Publish Post'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {ceSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2 mb-4">
              <i className="fas fa-check-circle"></i>
              <span>{ceSuccess}</span>
              <button onClick={() => setCeSuccess('')} className="ml-auto font-bold text-lg leading-none">&times;</button>
            </div>
          )}

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

          {/* Active alerts list */}
          {communityAlerts.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex items-center gap-3 text-slate-400 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
              No active alerts. Community is all clear.
            </div>
          ) : (
            <div className="space-y-3">
              {communityAlerts.map(alert => (
                <div key={alert.id} className="bg-red-50 border border-red-200 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-red-100 text-red-700">🚨 Live Alert</span>
                        <span className="text-xs text-slate-400">{new Date(alert.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <i className={`fas ${alert.icon} ${ALERT_ICONS.find(o => o.id === alert.icon)?.color ?? 'text-slate-500'} text-sm`}></i>
                        {alert.title}
                      </h2>
                      <p className="text-slate-600 text-sm">{alert.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {communityAlerts.length > 1 && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveAlert(communityAlerts.indexOf(alert), 'up')}
                            disabled={communityAlerts.indexOf(alert) === 0}
                            className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs px-2.5 py-2 rounded-xl transition-colors disabled:opacity-30"
                            title="Move up"
                          >
                            <i className="fas fa-chevron-up"></i>
                          </button>
                          <button
                            onClick={() => handleMoveAlert(communityAlerts.indexOf(alert), 'down')}
                            disabled={communityAlerts.indexOf(alert) === communityAlerts.length - 1}
                            className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs px-2.5 py-2 rounded-xl transition-colors disabled:opacity-30"
                            title="Move down"
                          >
                            <i className="fas fa-chevron-down"></i>
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setAlertTitle(alert.title);
                          setAlertDescription(alert.description);
                          setAlertIcon(alert.icon);
                          alertFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        disabled={alertActing}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        disabled={alertActing}
                        className="bg-white border border-red-200 text-red-600 hover:bg-red-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Post new alert form */}
          <div ref={alertFormRef} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Post New Alert</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ALERT_ICONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setAlertIcon(opt.id)}
                    title={opt.label}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${alertIcon === opt.id ? 'bg-red-50 border-red-400 text-red-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}
                  >
                    <i className={`fas ${opt.id} text-sm ${opt.color}`}></i>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
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
              onClick={() => { setAlertChecks([false, false, false]); setShowAlertConfirm(true); }}
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
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAdminCreate(v => !v)} className="text-xs font-bold text-orange-600 hover:text-orange-500">
                <i className={`fas ${showAdminCreate ? 'fa-minus' : 'fa-plus'} mr-1`}></i> {showAdminCreate ? 'Close' : 'Create New'}
              </button>
              <button onClick={() => { setBookingsLoaded(false); }} className="text-xs text-slate-400 hover:text-slate-600">
                <i className="fas fa-refresh mr-1"></i> Refresh
              </button>
            </div>
          </div>

          {/* Admin Create Spotlight/Featured Form */}
          {showAdminCreate && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Create Booking</h3>
                <div className="flex bg-slate-100 rounded-lg p-0.5 ml-auto">
                  <button onClick={() => setAdminCreateType('spotlight')} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${adminCreateType === 'spotlight' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Spotlight</button>
                  <button onClick={() => setAdminCreateType('featured')} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${adminCreateType === 'featured' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Featured</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Title *</label>
                  <input type="text" value={acTitle} onChange={e => setAcTitle(e.target.value)} maxLength={200} placeholder="Event or business name" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Week *</label>
                  <input type="date" value={acWeekStart} onChange={e => setAcWeekStart(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <p className="text-[10px] text-slate-400 mt-0.5">Pick the Sunday of the week</p>
                </div>
              </div>

              {adminCreateType === 'spotlight' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Teaser <span className="font-normal normal-case">(home page, max 120 chars)</span></label>
                  <input type="text" value={acTeaser} onChange={e => setAcTeaser(e.target.value)} maxLength={120} placeholder="Short hook for the home page" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description *</label>
                <textarea value={acDesc} onChange={e => setAcDesc(e.target.value)} maxLength={600} rows={3} placeholder="Full description for the events page" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Date</label>
                  <input type="date" value={acEventDate} onChange={e => setAcEventDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Time</label>
                  <input type="text" value={acEventTime} onChange={e => setAcEventTime(e.target.value)} placeholder="e.g. 4:30 – 6:30 PM" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Town</label>
                  <select value={acTown} onChange={e => setAcTown(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select...</option>
                    {adminTenant.towns.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Venue</label>
                <input type="text" value={acLocation} onChange={e => setAcLocation(e.target.value)} maxLength={300} placeholder="e.g. Grayson County Park" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tags <span className="font-normal normal-case">(optional)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {['Free Admission', 'All Ages Welcome', 'Family Friendly', 'Community Event', 'Live Music', 'Food & Drinks', 'Outdoor Event', 'Fundraiser', 'Grand Opening', 'Business Event'].map(tag => (
                    <button key={tag} onClick={() => setAcTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${acTags.includes(tag) ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{tag}</button>
                  ))}
                </div>
              </div>

              {adminCreateType === 'spotlight' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Banner Image *</label>
                    <input type="file" accept="image/*" onChange={e => setAcBanner(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                    <p className="text-[10px] text-slate-400 mt-0.5">16:9 ratio for events page</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Thumbnail</label>
                    <input type="file" accept="image/*" onChange={e => setAcThumb(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                    <p className="text-[10px] text-slate-400 mt-0.5">1:1 square for home page</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Flyer</label>
                    <input type="file" accept="image/*" onChange={e => setAcFlyer(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                    <p className="text-[10px] text-slate-400 mt-0.5">3:4 portrait flyer</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-xs">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Flyer Image *</label>
                  <input type="file" accept="image/*" onChange={e => setAcFlyer(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                  <p className="text-[10px] text-slate-400 mt-0.5">3:4 portrait — used as both the card image and flyer</p>
                </div>
              )}

              {acError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">{acError}</div>}

              <div className="flex gap-3">
                <button onClick={() => setShowAdminCreate(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleAdminCreateBooking} disabled={acSubmitting || !acTitle.trim() || !acDesc.trim() || !acWeekStart} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors disabled:opacity-50">
                  {acSubmitting ? 'Creating...' : `Create ${adminCreateType === 'spotlight' ? 'Spotlight' : 'Featured'}`}
                </button>
              </div>
            </div>
          )}

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
                      <textarea rows={6} placeholder="Description" value={editFields.description} onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300 resize-y" />
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
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{b.type === 'featured' ? 'Image' : 'Images'}</p>
                        {b.type === 'featured' ? (
                          <div className="max-w-xs">
                            <label className="text-[10px] text-slate-500 font-medium">Flyer (3:4)</label>
                            {editFields.flyerUrl && !editFlyer && <img src={editFields.flyerUrl} alt="" className="w-16 h-20 object-cover rounded-lg mt-1 mb-1" />}
                            <input type="file" accept="image/*" onChange={e => setEditFlyer(e.target.files?.[0] ?? null)} className="w-full text-[10px] text-slate-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-600" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 font-medium">Banner (16:9)</label>
                              {editFields.imageUrl && !editBanner && <img src={editFields.imageUrl} alt="" className="w-full h-16 object-cover rounded-lg mt-1 mb-1" />}
                              <input type="file" accept="image/*" onChange={e => setEditBanner(e.target.files?.[0] ?? null)} className="w-full text-[10px] text-slate-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-600" />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-medium">Thumbnail (1:1)</label>
                              {editFields.thumbnailUrl && !editThumb && <img src={editFields.thumbnailUrl} alt="" className="w-16 h-16 object-cover rounded-lg mt-1 mb-1" />}
                              <input type="file" accept="image/*" onChange={e => setEditThumb(e.target.files?.[0] ?? null)} className="w-full text-[10px] text-slate-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-600" />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-medium">Flyer (3:4)</label>
                              {editFields.flyerUrl && !editFlyer && <img src={editFields.flyerUrl} alt="" className="w-16 h-20 object-cover rounded-lg mt-1 mb-1" />}
                              <input type="file" accept="image/*" onChange={e => setEditFlyer(e.target.files?.[0] ?? null)} className="w-full text-[10px] text-slate-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-600" />
                            </div>
                          </div>
                        )}
                      </div>
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
                          }}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await updateEarlyAccessStatus(req.id, 'approved', req.providerId);
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
      {/* Alert Confirmation Modal */}
      {showAlertConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAlertConfirm(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 space-y-5 animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                <i className="fas fa-triangle-exclamation text-amber-500 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Before you post an alert</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Community Alerts are only for urgent, time-sensitive situations that affect multiple people.
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              {[
                { icon: 'fa-clock', color: 'text-blue-500', label: 'This is happening right now or today' },
                { icon: 'fa-users', color: 'text-violet-500', label: 'This affects more than just me' },
                { icon: 'fa-shield-halved', color: 'text-amber-500', label: 'This could cause risk or major inconvenience if ignored' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => setAlertChecks(prev => { const next = [...prev]; next[i] = !next[i]; return next; })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                    alertChecks[i]
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    alertChecks[i] ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-slate-300'
                  }`}>
                    {alertChecks[i] && <i className="fas fa-check text-white text-[10px]"></i>}
                  </div>
                  <i className={`fas ${item.icon} ${alertChecks[i] ? 'text-emerald-500' : item.color} text-sm flex-shrink-0 transition-colors`}></i>
                  <span className={`text-sm font-medium ${alertChecks[i] ? 'text-emerald-700' : 'text-slate-700'}`}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAlertConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowAlertConfirm(false); handlePostAlert(); }}
                disabled={!alertChecks.every(Boolean)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Post
              </button>
            </div>

            {/* Microcopy */}
            <p className="text-center text-xs text-slate-400">
              Alerts are reviewed to keep information accurate and helpful.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
