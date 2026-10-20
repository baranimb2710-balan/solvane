import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupUser } from '../services/api';

/**
 * Solvane - Signup Page ("/signup")
 * 
 * Connected to FastAPI Backend: POST /api/signup
 * 
 * Features:
 * - Clean centered card over a blurred Ramanathapuram background image.
 * - Form fields in order: Username, Email, Password, Confirm Password.
 * - Show/Hide password toggle icon.
 * - Live password rule checklist (each rule turns green with a tick when satisfied).
 * - Real-time client-side validation + backend error handling.
 * - Inline backend error messages next to relevant fields (e.g., username taken, email registered).
 * - "Sign Up" button disabled while form is invalid or request is in progress.
 * - Loading spinner during API call.
 * - Friendly error message ("Cannot reach server, please try again") when server is unreachable.
 * - On success: shows "Account created! Please login." and redirects to /login after 2 seconds.
 */

export default function Signup() {
  const navigate = useNavigate();

  // Form input state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Track if fields have been touched by user to show inline client errors
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  // Show/Hide password states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading state during API submission
  const [loading, setLoading] = useState(false);

  // Success and Error states
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    email: ''
  });

  // -------------------------------------------------------------
  // VALIDATION LOGIC
  // -------------------------------------------------------------

  // 1. Username: 3-20 characters, only letters, numbers, and underscore
  const isUsernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(formData.username);

  // 2. Email: valid email format
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  // 3. Password rules (Live checklist)
  const passwordRules = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // 4. Confirm password: must match password and not be empty
  const isConfirmPasswordValid =
    formData.confirmPassword.length > 0 &&
    formData.confirmPassword === formData.password;

  // Master form validity: All fields must satisfy their rules
  const isFormValid =
    isUsernameValid &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmPasswordValid;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear backend error when user starts editing that specific field
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  // Mark field as touched when user clicks out (blur)
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Handle form submission to FastAPI backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    // Reset previous feedback messages
    setLoading(true);
    setServerError('');
    setFieldErrors({ username: '', email: '' });
    setSuccessMessage('');

    // Call backend API helper
    const result = await signupUser({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      confirm_password: formData.confirmPassword
    });

    setLoading(false);

    if (result.success) {
      // 3. On success: show success message and redirect after 2 seconds
      setSuccessMessage('Account created! Please login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      // 4 & 5. On failure: display backend or network error
      const errorMessage = result.error || 'Signup failed. Please try again.';

      // Map backend duplicate error messages to the relevant input field
      const errLower = errorMessage.toLowerCase();
      if (errLower.includes('username')) {
        setFieldErrors((prev) => ({ ...prev, username: errorMessage }));
      } else if (errLower.includes('email')) {
        setFieldErrors((prev) => ({ ...prev, email: errorMessage }));
      } else {
        // General or network error ("Cannot reach server, please try again")
        setServerError(errorMessage);
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      
      {/* Blurred Ramanathapuram Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105"
        style={{ backgroundImage: "url('/images/slide2.jpg')" }}
      />
      
      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-950/85" />

      {/* Centered Glassmorphic Signup Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-8 animate-fade-in">
        
        {/* SOLVANE Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
                SOLVANE
              </span>
            </h1>
          </Link>
          <p className="text-xs sm:text-sm text-orange-400 font-semibold mt-1">
            Create your tourist account
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
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={() => handleBlur('username')}
              disabled={loading}
              placeholder="e.g. ramesh_24"
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                (touched.username && !isUsernameValid) || fieldErrors.username
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                  : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
              }`}
            />
            {/* Inline Client Error for Username */}
            {touched.username && !isUsernameValid && !fieldErrors.username && (
              <p className="text-[11px] text-red-400 mt-1 font-medium">
                Must be 3-20 characters with letters, numbers, or underscore only.
              </p>
            )}
            {/* Inline Backend Error for Username (e.g. Username already exists) */}
            {fieldErrors.username && (
              <p className="text-[11px] text-red-400 mt-1 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors.username}</span>
              </p>
            )}
          </div>

          {/* 2. Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              disabled={loading}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                (touched.email && !isEmailValid) || fieldErrors.email
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                  : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
              }`}
            />
            {/* Inline Client Error for Email */}
            {touched.email && !isEmailValid && !fieldErrors.email && (
              <p className="text-[11px] text-red-400 mt-1 font-medium">
                Please enter a valid email address.
              </p>
            )}
            {/* Inline Backend Error for Email (e.g. Email already registered) */}
            {fieldErrors.email && (
              <p className="text-[11px] text-red-400 mt-1 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* 3. Password Field with Show/Hide Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={() => handleBlur('password')}
                disabled={loading}
                placeholder="Create strong password"
                className={`w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                  touched.password && !isPasswordValid
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                    : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
                }`}
              />
              {/* Show/Hide Eye Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* LIVE PASSWORD RULES CHECKLIST */}
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950/40 border border-white/10 space-y-1.5 text-[11px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Password Requirements:
              </p>
              
              {/* Rule 1: At least 8 characters */}
              <div className={`flex items-center gap-2 transition-colors ${passwordRules.length ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                <span>{passwordRules.length ? '✓' : '○'}</span>
                <span>At least 8 characters</span>
              </div>

              {/* Rule 2: At least 1 uppercase */}
              <div className={`flex items-center gap-2 transition-colors ${passwordRules.uppercase ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                <span>{passwordRules.uppercase ? '✓' : '○'}</span>
                <span>At least 1 uppercase letter (A-Z)</span>
              </div>

              {/* Rule 3: At least 1 lowercase */}
              <div className={`flex items-center gap-2 transition-colors ${passwordRules.lowercase ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                <span>{passwordRules.lowercase ? '✓' : '○'}</span>
                <span>At least 1 lowercase letter (a-z)</span>
              </div>

              {/* Rule 4: At least 1 number */}
              <div className={`flex items-center gap-2 transition-colors ${passwordRules.number ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                <span>{passwordRules.number ? '✓' : '○'}</span>
                <span>At least 1 number (0-9)</span>
              </div>

              {/* Rule 5: At least 1 special character */}
              <div className={`flex items-center gap-2 transition-colors ${passwordRules.special ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                <span>{passwordRules.special ? '✓' : '○'}</span>
                <span>At least 1 special character (!@#$%^&*...)</span>
              </div>
            </div>
          </div>

          {/* 4. Confirm Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={() => handleBlur('confirmPassword')}
                disabled={loading}
                placeholder="Re-enter password"
                className={`w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                  touched.confirmPassword && !isConfirmPasswordValid
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
            {/* Inline Error for Confirm Password */}
            {touched.confirmPassword && !isConfirmPasswordValid && (
              <p className="text-[11px] text-red-400 mt-1 font-medium">
                Passwords do not match.
              </p>
            )}
          </div>

          {/* Sign Up Submit Button (Disabled until form is valid or while loading) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full py-3 rounded-full font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                isFormValid && !loading
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] cursor-pointer'
                  : 'bg-slate-700/60 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {loading ? (
                <>
                  {/* Loading Spinner */}
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Sign Up</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link to Login */}
        <div className="text-center mt-6 pt-5 border-t border-white/10 text-xs text-slate-400">
          <span>Already have an account? </span>
          <Link
            to="/login"
            className="text-orange-400 hover:text-orange-300 font-bold transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
