import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../services/api';

/**
 * TopBar Component
 * Shared responsive navigation bar across all authenticated pages of Solvane.
 * 
 * Features:
 * - Brand logo linking to home
 * - Navigation links: Explore (/explore), Destinations (/destinations), Plan (/plan), Admin (/admin/places)
 * - Highlights the currently active tab
 * - Logout button with session clearance
 */
export default function TopBar({ active = '' }) {
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = Boolean(user && user.is_admin);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const linkClass = (name) => {
    const isActive = active === name;
    if (isActive) {
      return 'text-xs font-bold text-orange-400 bg-orange-500/15 border border-orange-400/40 px-3 py-1.5 rounded-full shadow-sm shadow-orange-500/20 transition-all';
    }
    return 'text-xs font-semibold text-sky-200/80 hover:text-white transition-colors px-2.5 py-1.5 rounded-full hover:bg-white/10';
  };

  return (
    <header className="relative z-30 pt-3.5 pb-3 px-4 sm:px-12 flex items-center justify-between border-b border-white/10 bg-slate-950/75 backdrop-blur-md sticky top-0 shadow-sm">
      {/* Brand logo & District Badge */}
      <Link to="/" className="flex items-center gap-2 group">
        <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
          SOLVANE
        </span>
        <span className="text-[10px] font-semibold text-sky-200/70 border border-sky-400/20 px-2 py-0.5 rounded-full hidden sm:inline">
          Ramanathapuram
        </span>
      </Link>

      {/* Navigation Links & Logout */}
      <nav className="flex items-center gap-1.5 sm:gap-3">
        <Link to="/explore" className={linkClass('explore')}>
          Explore
        </Link>
        <Link to="/destinations" className={linkClass('destinations')}>
          Destinations
        </Link>
        <Link to="/plan" className={linkClass('plan')}>
          Plan
        </Link>
        <Link to="/map" className={linkClass('map')}>
          Map
        </Link>
        <Link to="/chat" className={linkClass('chat')}>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            Ask Solvane
          </span>
        </Link>
        {isAdmin && (
          <Link to="/admin/places" className={linkClass('admin')}>
            Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="ml-1 sm:ml-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer"
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
