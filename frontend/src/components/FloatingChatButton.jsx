import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Mascot from './Mascot';

/**
 * FloatingChatButton Component
 * Renders a sticky floating action button on the bottom right of key discovery pages (Destinations, Plan)
 * that takes the traveler directly to the Solvane AI Guide (/chat).
 */
export default function FloatingChatButton({ className = '' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate('/chat')}
      aria-label="Ask Solvane AI Guide"
      className={`fixed z-40 group flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-amber-300/40 ${
        className || 'bottom-6 right-6'
      }`}
    >
      {/* Mascot Avatar */}
      <Mascot pose="wave" size={28} animate={false} />

      <span className="tracking-tight">{t('common.askSolvane', 'Ask Solvane')}</span>

      <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-ping" />
    </button>
  );
}
