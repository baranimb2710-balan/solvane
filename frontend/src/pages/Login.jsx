import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loginUser } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Mascot from '../components/Mascot';

/**
 * Solvane - User Login Page ("/login")
 * Simplified, reliable login:
 * - Email: trimmed, case-insensitive matching.
 * - Password: checked with bcrypt against stored hash.
 * - Button is ALWAYS clickable unless request is in flight.
 * - Clear inline error messages and visible console logging.
 */
export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const validate = () => {
    const errors = {};
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail) {
      errors.email = t('auth.validation.emailRequired', 'Email address is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = t('auth.validation.invalidEmail', 'Please enter a valid email address.');
    }

    if (!password) {
      errors.password = t('auth.validation.passwordRequired', 'Password is required.');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage('');
    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.warn('[Solvane Login] Form validation failed:', errors);
      return;
    }

    setLoading(true);
    const credentials = {
      email: email.trim().toLowerCase(),
      password: password,
    };

    console.log('[Solvane Login] Attempting login for:', credentials.email);

    const result = await loginUser(credentials);
    setLoading(false);

    if (result.success) {
      console.log('[Solvane Login] Login successful:', result.data.user);
      navigate('/budget');
    } else {
      console.error('[Solvane Login] Login failed:', result);
      setErrorMessage(result.error || 'Invalid email or password');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Blurred Ramanathapuram Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />

      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-950/85 pointer-events-none" />

      {/* Centered Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-8 animate-fade-in">
        {/* Top bar with Back Link and Language Switcher */}
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="text-xs text-sky-300 hover:text-white flex items-center gap-1 transition-colors">
            <span>←</span>
            <span>{t('common.brand', 'SOLVANE')}</span>
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Mascot & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-2">
            <Mascot pose="wave" size={44} animate={true} />
          </div>
          <Link to="/" className="inline-block">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
                {t('common.brand', 'SOLVANE')}
              </span>
            </h1>
          </Link>
          <p className="text-xs sm:text-sm text-orange-400 font-semibold mt-1">
            {t('auth.loginSubtitle', 'Sign in to continue your journey')}
          </p>
        </div>

        {/* Backend / Network Error Banner */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-400/50 text-red-300 text-xs font-semibold text-center animate-fade-in flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              {t('auth.emailLabel', 'Email address')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                if (errorMessage) setErrorMessage('');
              }}
              disabled={loading}
              placeholder={t('auth.emailPlaceholder', 'you@example.com')}
              autoComplete="email"
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                fieldErrors.email
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                  : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              {t('auth.passwordLabel', 'Password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={loading}
                placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                autoComplete="current-password"
                className={`w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                  fieldErrors.password
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                    : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Login Submit Button (ALWAYS CLICKABLE unless loading) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-full font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-95 cursor-pointer'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('auth.signingIn', 'Signing in...')}</span>
                </>
              ) : (
                <span>{t('auth.loginButton', 'Sign In')}</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link to Signup */}
        <div className="text-center mt-6 pt-5 border-t border-white/10 text-xs text-slate-400">
          <span>{t('auth.noAccount', "Don't have an account?")} </span>
          <Link
            to="/signup"
            className="text-orange-400 hover:text-orange-300 font-bold transition-colors ml-1"
          >
            {t('auth.createAccount', 'Create an account')}
          </Link>
        </div>
      </div>
    </div>
  );
}
