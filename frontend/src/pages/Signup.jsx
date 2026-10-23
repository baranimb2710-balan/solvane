import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signupUser } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Mascot from '../components/Mascot';

/**
 * Solvane - User Signup Page ("/signup")
 * Simplified, reliable authentication:
 * - Username: 3-20 chars (letters, numbers, underscore only).
 * - Email: valid email format, trimmed, case-insensitive.
 * - Password: at least 6 characters (safe bcrypt up to 72 bytes).
 * - Confirm Password: must match.
 * - Button is ALWAYS clickable unless request is in flight.
 * - Shows inline errors and console logs for visible debugging.
 */
export default function Signup() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field change handler: clears error for the edited field
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  // Pure validation function: returns error object
  const validate = () => {
    const errors = {};
    const trimmedUsername = (formData.username || '').trim();
    const trimmedEmail = (formData.email || '').trim().toLowerCase();
    const password = formData.password || '';
    const confirmPassword = formData.confirmPassword || '';

    // 1. Username Validation: 3-20 chars, letters, numbers, underscore
    if (!trimmedUsername) {
      errors.username = t('auth.validation.usernameRequired', 'Please choose a username.');
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      errors.username = t(
        'auth.validation.usernameInvalid',
        'Username must be 3 to 20 characters (letters, numbers, and underscore only).'
      );
    }

    // 2. Email Validation: valid email format
    if (!trimmedEmail) {
      errors.email = t('auth.validation.emailRequired', 'Please enter your email address.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = t('auth.validation.invalidEmail', 'Please enter a valid email address.');
    }

    // 3. Password Validation: at least 6 characters, max 72 bytes
    if (!password) {
      errors.password = t('auth.validation.passwordRequired', 'Please enter your password.');
    } else if (password.length < 6) {
      errors.password = t('auth.validation.passwordMin', 'Password must be at least 6 characters.');
    } else if (new TextEncoder().encode(password).length > 72) {
      errors.password = t('auth.validation.passwordMax', 'Password cannot be longer than 72 characters.');
    }

    // 4. Confirm Password Validation: must match
    if (!confirmPassword) {
      errors.confirmPassword = t('auth.validation.confirmPasswordRequired', 'Please confirm your password.');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordsDoNotMatch', 'Passwords do not match.');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setServerError('');
    setSuccessMessage('');

    // Validate on click
    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.warn('[Solvane Signup] Form validation failed:', errors);
      return;
    }

    setLoading(true);
    const payload = {
      username: formData.username.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      confirm_password: formData.confirmPassword,
    };

    console.log('[Solvane Signup] Submitting payload for:', payload.username, payload.email);

    const result = await signupUser(payload);
    setLoading(false);

    if (result.success) {
      console.log('[Solvane Signup] Account created successfully:', result.data);
      setSuccessMessage(t('auth.accountCreated', 'Account created! Please login.'));
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      console.error('[Solvane Signup] Server returned error:', result);
      const errMsg = result.error || 'Signup failed. Please try again.';

      // Map backend error to specific field if indicated or recognizable
      if (result.field && ['username', 'email', 'password', 'confirmPassword'].includes(result.field)) {
        setFieldErrors((prev) => ({ ...prev, [result.field]: errMsg }));
      } else {
        const lower = errMsg.toLowerCase();
        if (lower.includes('username')) {
          setFieldErrors((prev) => ({ ...prev, username: errMsg }));
        } else if (lower.includes('email')) {
          setFieldErrors((prev) => ({ ...prev, email: errMsg }));
        } else if (lower.includes('password')) {
          setFieldErrors((prev) => ({ ...prev, password: errMsg }));
        } else {
          setServerError(errMsg);
        }
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Blurred Ramanathapuram Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/slide2.jpg')" }}
      />

      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-950/85 pointer-events-none" />

      {/* Centered Glassmorphic Signup Card */}
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
            {t('auth.signupSubtitle', 'Create your tourist account')}
          </p>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-semibold text-center animate-fade-in flex items-center justify-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Server / Network Error Banner */}
        {serverError && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-400/50 text-red-300 text-xs font-semibold text-center animate-fade-in flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* 1. Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              {t('auth.usernameLabel', 'Username')}
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              placeholder={t('auth.usernamePlaceholder', 'Choose a username (e.g. ramesh_24)')}
              autoComplete="username"
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                fieldErrors.username
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                  : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
              }`}
            />
            {fieldErrors.username && (
              <p className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors.username}</span>
              </p>
            )}
          </div>

          {/* 2. Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              {t('auth.emailLabel', 'Email Address')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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

          {/* 3. Password Field with Show/Hide Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('auth.passwordLabel', 'Password')}
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {t('auth.passwordHint', 'At least 6 characters')}
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                placeholder={t('auth.passwordPlaceholder', 'Enter password')}
                autoComplete="new-password"
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

          {/* 4. Confirm Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              {t('auth.confirmPasswordLabel', 'Confirm Password')}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter password')}
                autoComplete="new-password"
                className={`w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                  fieldErrors.confirmPassword
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                    : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors.confirmPassword}</span>
              </p>
            )}
          </div>

          {/* Sign Up Submit Button (ALWAYS CLICKABLE unless loading) */}
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
                  <span>{t('auth.signingUp', 'Creating Account...')}</span>
                </>
              ) : (
                <span>{t('auth.signupButton', 'Create Account')}</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link to Login */}
        <div className="text-center mt-6 pt-5 border-t border-white/10 text-xs text-slate-400">
          <span>{t('auth.haveAccount', 'Already have an account?')} </span>
          <Link
            to="/login"
            className="text-orange-400 hover:text-orange-300 font-bold transition-colors ml-1"
          >
            {t('auth.logIn', 'Login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
