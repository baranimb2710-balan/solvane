import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * FloatingChatButton Component
 * Renders a sticky floating action button on the bottom right of key discovery pages (Destinations, Plan)
 * that takes the traveler directly to the Solvane AI Guide (/chat).
 */
export default function FloatingChatButton({ className = '' }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/chat')}
      aria-label="Ask Solvane AI Guide"
      className={`fixed z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-amber-300/40 ${
        className || 'bottom-6 right-6'
      }`}
    >
      {/* Sparkle icon */}
      <div className="relative">
        <svg
          className="w-5 h-5 text-slate-950 group-hover:rotate-12 transition-transform"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      </div>

      <span className="tracking-tight">Ask Solvane</span>

      <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-ping" />
    </button>
  );
}
