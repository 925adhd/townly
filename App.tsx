
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/** Login link that remembers the current page so Auth.tsx can redirect back after login. */
function LoginLink({ className, children }: { className: string; children: React.ReactNode }) {
  const location = useLocation();
  const from = location.pathname === '/login' ? '/' : location.pathname + location.search;
  return <Link to="/login" state={{ from }} className={className}>{children}</Link>;
}
import { getCurrentTenant } from './tenants';
import Home from './pages/Home';
import Directory from './pages/Directory';
import ProviderDetail from './pages/ProviderDetail';
import LostFound from './pages/LostFound';
import CreateLostFound from './pages/CreateLostFound';
import AddProvider from './pages/AddProvider';
import AddReview from './pages/AddReview';
import Recommendations from './pages/Recommendations';
import QuestionDetail from './pages/QuestionDetail';
import Auth from './pages/Auth';
import Spotlights from './pages/Events';
import Promote from './pages/Promote';
import BookSpotlight from './pages/BookSpotlight';
import BookingSuccess from './pages/BookingSuccess';
import Admin from './pages/Admin';
import OwnerPortal from './pages/OwnerPortal';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Alerts from './pages/Alerts';
import { supabase } from './lib/supabase';
import { fetchLostFound, fetchRequests, fetchActiveAlerts, signOut, prefetchProviders, prefetchHomeImages, prefetchCurrentWeekSubmissions, prefetchUserCount, fetchMyClaimedListing, claimPendingListings } from './lib/api';

// Kick off background fetches immediately on module load — before any component mounts
prefetchProviders();
prefetchHomeImages();
prefetchCurrentWeekSubmissions();
prefetchUserCount();
import ErrorBoundary from './components/ErrorBoundary';
import Avatar from './components/avatar/Avatar';
import { LostFoundPost, RecommendationRequest, CommunityAlert } from './types';

const tenant = getCurrentTenant();

const App: React.FC = () => {
  const [chairRocking, setChairRocking] = useState(false);
  const [lostFound, setLostFound] = useState<LostFoundPost[]>([]);
  const [requests, setRequests] = useState<RecommendationRequest[]>([]);
  const [communityAlerts, setCommunityAlerts] = useState<CommunityAlert[]>([]);
  const [nwsAlerts, setNwsAlerts] = useState<{ id: string; event: string; headline: string; severity: string; senderName: string; expires: string | null }[]>([]);
  const [user, setUser] = useState<{ id: string, name: string, email?: string, role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasBookings, setHasBookings] = useState(() => !!localStorage.getItem('townly_has_bookings'));
  const [isFbBrowser, setIsFbBrowser] = useState(false);
  const [hasClaimedListing, setHasClaimedListing] = useState(false);

  // Detect Facebook/Instagram in-app browser and adjust for viewport quirks
  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/FBAN|FBAV|Instagram/i.test(ua)) {
      setIsFbBrowser(true);
      document.documentElement.classList.add('fb-browser');
    }
  }, []);

  // Load data from Supabase on mount
  useEffect(() => {
    Promise.all([
      fetchLostFound(),
      fetchRequests(),
      fetchActiveAlerts(),
    ]).then(([lf, req, alerts]) => {
      setLostFound(lf);
      setRequests(req);
      setCommunityAlerts(alerts);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Fetch NWS alerts for Grayson County — poll every 5 minutes
  useEffect(() => {
    const fetchNWS = () => {
      fetch('https://api.weather.gov/alerts/active?zone=KYZ021,KYC085', { headers: { Accept: 'application/geo+json' } })
        .then(r => r.json())
        .then(data => {
          const seen = new Set<string>();
          const alerts = (data.features ?? [])
            .map((f: any) => ({
              id: f.id as string,
              event: f.properties.event as string,
              headline: f.properties.headline as string,
              severity: f.properties.severity as string,
              senderName: f.properties.senderName as string,
              expires: f.properties.expires ?? null,
            }))
            .filter((a: { event: string; expires: string | null }) => {
              const key = a.event;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          setNwsAlerts(alerts);
        })
        .catch(() => {});
    };
    fetchNWS();
    const interval = setInterval(fetchNWS, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle auth callback tokens (email change, password reset, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    // Whitelist valid OTP types — prevents arbitrary strings from being passed
    // to the SDK via crafted callback URLs.
    const VALID_OTP_TYPES = ['email', 'recovery', 'signup', 'invite', 'magiclink', 'email_change'] as const;
    type ValidOtpType = typeof VALID_OTP_TYPES[number];
    const isValidType = (t: string | null): t is ValidOtpType =>
      !!t && (VALID_OTP_TYPES as readonly string[]).includes(t);
    if (tokenHash && isValidType(type)) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        .then(() => {
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, []);

  // Sync auth session
  useEffect(() => {
    const loadUser = async (supabaseUser: { id: string; user_metadata?: any; email?: string }) => {
      const name = supabaseUser.user_metadata?.name || supabaseUser.email || 'User';
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, deleted_at')
        .eq('id', supabaseUser.id)
        .single();
      if (profile?.deleted_at) {
        await supabase.auth.signOut();
        setUser(null);
        return;
      }
      setUser({ id: supabaseUser.id, name, email: supabaseUser.email ?? undefined, role: profile?.role ?? undefined });

      // Auto-claim any listings pre-assigned to this email by an admin
      if (supabaseUser.email) {
        claimPendingListings(supabaseUser.id, supabaseUser.email).catch(() => {});
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUser(session.user);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if user has a claimed listing (for nav button)
  useEffect(() => {
    if (!user) { setHasClaimedListing(false); return; }
    fetchMyClaimedListing().then(p => setHasClaimedListing(!!p)).catch(() => {});
  }, [user?.id]);

  // Keep hasBookings in sync if BookingSuccess sets the flag in the same tab
  useEffect(() => {
    const onStorage = () => setHasBookings(!!localStorage.getItem('townly_has_bookings'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    // Clear any persisted spotlight drafts and booking flags so the next user on this device starts clean
    localStorage.removeItem('spotlight_draft');
    localStorage.removeItem('featured_draft');
    localStorage.removeItem('townly_has_bookings');
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col nav-page-pb">
        {/* Sticky top wrapper — tornado banner + header stay together */}
        <div className="sticky top-0 z-50">
          {nwsAlerts.some(a => a.event.toLowerCase().includes('tornado warning')) && (
            <div className="bg-red-700 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-bold tracking-wide">
              <i className="fas fa-tornado text-base animate-pulse"></i>
              <span>TORNADO WARNING IN EFFECT FOR GRAYSON COUNTY</span>
              <i className="fas fa-tornado text-base animate-pulse"></i>
            </div>
          )}
        <header className="bg-white border-b border-slate-200 h-16 md:h-20">
          <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between relative">
            <span className="md:hidden absolute left-1/2 -translate-x-1/2 font-bold text-slate-900 text-base pointer-events-none">{tenant.name}</span>
            <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center space-x-2" onMouseEnter={() => { prefetchHomeImages(); prefetchCurrentWeekSubmissions(); }}>
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/chair-icon.webp"
                  alt={tenant.displayName}
                  className={`h-10 w-auto object-contain chair-icon${chairRocking ? ' rocking' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChairRocking(true);
                    const onHome = window.location.pathname === '/';
                    if (!onHome) window.location.href = '/';
                    else e.preventDefault();
                  }}
                  onAnimationEnd={() => setChairRocking(false)}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <span className="hidden md:inline font-bold text-slate-900 text-lg">{tenant.name}</span>
              <div className="fallback-text hidden flex flex-col -space-y-3">
                <span className="font-porch text-orange-600 text-2xl drop-shadow-sm">Front</span>
                <span className="font-talk text-slate-900 text-lg tracking-wider">PORCH</span>
              </div>
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="md:hidden flex flex-col items-center text-slate-400 hover:text-orange-600 transition-colors">
                <i className="fas fa-shield-halved text-lg"></i>
                <span className="text-[10px] mt-1 font-medium">Admin</span>
              </Link>
            )}
            {hasClaimedListing && user?.role !== 'admin' && (
              <Link to="/my-listing" className="md:hidden flex flex-col items-center text-slate-400 hover:text-emerald-600 transition-colors">
                <i className="fas fa-store text-lg"></i>
                <span className="text-[10px] mt-1 font-medium">My Listing</span>
              </Link>
            )}
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/events" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Events</Link>
              <Link to="/directory" className="text-slate-600 hover:text-orange-600 font-medium transition-colors" onMouseEnter={prefetchProviders}>Directory</Link>
              <Link to="/lost-found" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Lost & Found</Link>
              <Link to="/ask" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Ask Community</Link>
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link to="/profile" className="text-sm font-medium text-slate-500 hover:text-orange-600 transition-colors flex items-center gap-1.5">
                    <Avatar user={user} size="xs" /> {user.name}
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors">Admin</Link>
                  )}
                  {hasClaimedListing && user.role !== 'admin' && (
                    <Link to="/my-listing" className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors">My Listing</Link>
                  )}
                  <button onClick={handleLogout} className="text-sm font-semibold text-orange-600">Logout</button>
                </div>
              ) : (
                <LoginLink className="bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors shadow-sm">Login</LoginLink>
              )}
            </nav>

            <div className="md:hidden flex items-center space-x-3">
              {user ? (
                <>
                  <Link to="/profile" className="flex flex-col items-center text-slate-400 hover:text-orange-600 transition-colors">
                    <Avatar user={user} size="sm" />
                    <span className="text-[10px] mt-1 font-medium">Account</span>
                  </Link>
                  <button onClick={handleLogout} className="flex flex-col items-center text-slate-500 hover:text-orange-600 transition-colors">
                    <i className="fas fa-right-from-bracket text-lg"></i>
                    <span className="text-[10px] mt-1 font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <LoginLink className="flex flex-col items-center text-orange-600 hover:text-orange-700 transition-colors">
                  <i className="fas fa-user text-lg"></i>
                  <span className="text-[10px] mt-1 font-medium">Login</span>
                </LoginLink>
              )}
            </div>
          </div>
        </header>
        </div>{/* end sticky top wrapper */}

        <main className="flex-grow max-w-7xl mx-auto w-full px-3 py-3 md:px-4 md:py-6">
          <ErrorBoundary>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-400 text-sm font-medium">Loading...</div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Home lostFound={lostFound} communityAlerts={communityAlerts} nwsAlerts={nwsAlerts} />} />
              <Route path="/search" element={<Search />} />
              <Route path="/directory" element={<Directory user={user} />} />
              <Route path="/provider/:id" element={<ProviderDetail user={user} />} />
              <Route path="/lost-found" element={<LostFound posts={lostFound} setPosts={setLostFound} user={user} />} />
              <Route path="/lost-found/new" element={<CreateLostFound setPosts={setLostFound} user={user} />} />
              <Route path="/add-provider" element={<AddProvider user={user} />} />
              <Route path="/review/:providerId" element={<AddReview user={user} />} />
              <Route path="/ask" element={<Recommendations requests={requests} setRequests={setRequests} user={user} />} />
              <Route path="/ask/:slug" element={<QuestionDetail user={user} />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/events" element={<Spotlights user={user} />} />
              <Route path="/promote" element={<Promote user={user} />} />
              <Route path="/book/:type" element={<BookSpotlight user={user} />} />
              <Route path="/book/success" element={<BookingSuccess user={user} onBookingConfirmed={() => setHasBookings(true)} />} />
              <Route path="/my-bookings" element={<MyBookings user={user} />} />
              <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
              <Route path="/admin" element={<Admin user={user} communityAlerts={communityAlerts} setCommunityAlerts={setCommunityAlerts} />} />
              <Route path="/my-listing" element={<OwnerPortal user={user} />} />
              <Route path="/alerts" element={<Alerts communityAlerts={communityAlerts} nwsAlerts={nwsAlerts} />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
          </ErrorBoundary>
        </main>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 mobile-nav-shadow" style={{ paddingBottom: isFbBrowser ? '0px' : 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="h-14 flex items-center justify-around">
            <Link to="/" className="flex flex-col items-center text-slate-400 hover:text-orange-600" onMouseEnter={() => { prefetchHomeImages(); prefetchCurrentWeekSubmissions(); }}>
              <i className="fas fa-home text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Home</span>
            </Link>
            <Link to="/directory" state={{ scrollTop: true }} className="flex flex-col items-center text-slate-400 hover:text-orange-600" onMouseEnter={prefetchProviders}>
              <i className="fas fa-store text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Directory</span>
            </Link>
            <Link to="/events" className="flex flex-col items-center text-slate-400 hover:text-orange-600">
              <i className="fas fa-calendar-alt text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Events</span>
            </Link>
            <Link to="/ask" className="flex flex-col items-center text-slate-400 hover:text-orange-600">
              <i className="fas fa-comments text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Ask</span>
            </Link>
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
};

export default App;
