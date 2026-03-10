
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, signUp } from '../lib/api';
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
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/');
        }
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
    <div className="max-w-md mx-auto pt-2 sm:pt-10">
      {isSocialContext && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-3 rounded-2xl mb-3 flex items-center gap-2">
          <i className="fas fa-pencil text-blue-400 flex-shrink-0"></i>
          Create a free account or sign in to post community events.
        </div>
      )}
      <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-xl">
        <div className="text-center mb-3 sm:mb-8">
           <img src="/images/chair-icon.webp" alt={tenant.displayName} className="w-12 h-12 sm:w-32 sm:h-32 mx-auto mb-1 sm:mb-3 object-contain animate-rock" />
           <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{isLogin ? 'Welcome Back' : `Join ${tenant.displayName}`}</h1>
           <p className="text-orange-600 font-semibold text-sm mt-0.5">{tenant.displayName}</p>
           <p className="text-slate-500 text-sm mt-1 hidden sm:block">
             Sign in to leave reviews and help the community stay safe and connected.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
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
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 pr-11 text-sm focus:ring-2 focus:ring-orange-500 outline-none ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:ring-red-400' : 'border-slate-200'}`}
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
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg hover:bg-orange-500 transition-colors transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-3 sm:mt-8 pt-3 sm:pt-6 border-t border-slate-100 text-center">
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
