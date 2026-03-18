
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, signUp, signInWithProvider } from '../lib/api';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

const Auth: React.FC = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(!new URLSearchParams(location.search).has('signup'));
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        const from = (location.state as any)?.from || '/';
        navigate(from, { replace: true });
      } else {
        await signUp(email, password, name);
        setSignedUp(true);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (signedUp) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <i className="fas fa-envelope-circle-check text-green-500 text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Check Your Inbox</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            We sent a confirmation link to <span className="font-semibold text-slate-700">{email}</span>. Click it to activate your account, then come back and sign in.
          </p>
          <button
            onClick={() => { setSignedUp(false); setIsLogin(true); setPassword(''); setConfirmPassword(''); }}
            className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-500 transition-colors mt-2"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  const isSocialContext = new URLSearchParams(location.search).has('signup');

  return (
    <div className="max-w-md mx-auto pt-2 sm:pt-6 pb-6">
      {isSocialContext && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-3 rounded-2xl mb-3 flex items-center gap-2">
          <i className="fas fa-lock text-blue-400 flex-shrink-0"></i>
          Sign in or create a free account to continue.
        </div>
      )}
      <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-100 shadow-xl">
        <div className="text-center mb-2 sm:mb-6">
           <img src="/images/chair-icon.webp" alt={tenant.displayName} className="w-10 h-10 sm:w-20 sm:h-20 mx-auto mb-1 sm:mb-2 object-contain animate-rock" />
           <h1 className="text-lg sm:text-2xl font-bold text-slate-900">{isLogin ? 'Welcome Back' : 'Join Townly'}</h1>
           <p className="text-orange-600 font-semibold text-xs sm:text-sm mt-0.5">{tenant.tagline}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 pr-11 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 sm:py-3 pr-11 text-sm focus:ring-2 focus:ring-orange-500 outline-none ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:ring-red-400' : 'border-slate-200'}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1 ml-1">Passwords do not match</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white font-bold py-2.5 sm:py-4 rounded-xl shadow-lg hover:bg-orange-500 transition-colors transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4 sm:my-5">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-400 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* Social login buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              const from = (location.state as any)?.from || '/';
              signInWithProvider('google', `${window.location.origin}${from}`).catch(err => setError(err.message));
            }}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-semibold py-2.5 sm:py-3 rounded-xl transition-all text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-4 sm:mt-6 pt-3 sm:pt-5 border-t border-slate-100 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false); }}
            className="text-sm font-semibold text-orange-600"
          >
            {isLogin ? "Don't have an account? Join for free" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
