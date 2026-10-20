import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api';

/**
 * Solvane - Login Page ("/login")
 * 
 * Connected to FastAPI Backend: POST /api/login
 * 
 * Features:
 * - Clean centered card over a blurred Ramanathapuram background image.
 * - Fields: Email and Password with Show/Hide eye toggle.
 * - Inline email validation.
 * - Backend error handling (e.g., "Invalid email or password").
 * - Network resilience ("Cannot reach server, please try again").
 * - Loading spinner during API request.
 * - On success: saves JWT token and user info in localStorage, redirects to /budget.
 * - "New user? Sign up" link navigating to /signup.
 */

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field touched state for inline error validation
  const [emailTouched, setEmailTouched] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Error message state
  const [errorMessage, setErrorMessage] = useState('');

  // Email format validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);

    if (!email || !isEmailValid || !password || loading) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    // Call backend API helper
    const result = await loginUser({ email, password });

    setLoading(false);

    if (result.success) {
      // 7. On success: redirect to /budget (token already stored by loginUser)
      navigate('/budget');
    } else {
      // Show backend error (e.g. "Invalid email or password" or "Cannot reach server, please try again")
      setErrorMessage(result.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      
      {/* Blurred Ramanathapuram Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />
      
      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-950/85" />

      {/* Centered Glassmorphic Login Card */}
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
            Sign in to continue your journey
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
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              onBlur={() => setEmailTouched(true)}
              disabled={loading}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                emailTouched && (!email || !isEmailValid)
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                  : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
              }`}
            />
            {/* Inline Error for Email */}
            {emailTouched && !email && (
              <p className="text-[11px] text-red-400 mt-1 font-medium">
                Email address is required.
              </p>
            )}
            {emailTouched && email && !isEmailValid && (
              <p className="text-[11px] text-red-400 mt-1 font-medium">
                Please enter a valid email address.
              </p>
            )}
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={loading}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-slate-800/80 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all"
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
          </div>

          {/* Login Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full py-3 rounded-full font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                !loading && email && password
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-95 cursor-pointer'
                  : 'bg-slate-700/60 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Logging In...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link to Signup */}
        <div className="text-center mt-6 pt-5 border-t border-white/10 text-xs text-slate-400">
          <span>New user? </span>
          <Link
            to="/signup"
            className="text-orange-400 hover:text-orange-300 font-bold transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
