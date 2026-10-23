import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../components/TopBar';
import FloatingChatButton from '../components/FloatingChatButton';
import Mascot from '../components/Mascot';
import { getSavedPlans, deleteSavedPlan } from '../services/api';
import { generatePlanPdf } from '../utils/generatePlanPdf';

/**
 * Solvane - My Trips Page ("/my-trips")
 * Displays the authenticated user's saved itineraries.
 * Features:
 * 1. Saved trips card grid with title, date, duration, budget, and stops count.
 * 2. "Open" view showing the complete interactive timeline, day tabs, and AI tips.
 * 3. "Show on Map" routing per day.
 * 4. "Download PDF" client-side generation.
 * 5. Delete plan with confirmation dialog.
 * 6. Empty state with link to /plan.
 */
export default function MyTrips() {
  const { t, i18n } = useTranslation();
  const isTamil = i18n.language === 'ta';
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected plan for full detail inspection
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Delete modal state
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(null);
  const [failedThumbnails, setFailedThumbnails] = useState({});

  const handleImageError = (placeId) => {
    setFailedThumbnails((prev) => ({ ...prev, [placeId]: true }));
  };

  const loadSavedPlans = async () => {
    setLoading(true);
    setError('');
    const res = await getSavedPlans();
    setLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setPlans(res.data);
    } else {
      setError(res.error || 'Failed to load your saved trips.');
    }
  };

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const handleDelete = async () => {
    if (!confirmDeletePlan) return;
    const planId = confirmDeletePlan.plan_id;
    setDeletingId(planId);
    const res = await deleteSavedPlan(planId);
    setDeletingId(null);
    setConfirmDeletePlan(null);

    if (res.success) {
      setPlans((prev) => prev.filter((p) => p.plan_id !== planId));
      if (selectedPlan && selectedPlan.plan_id === planId) {
        setSelectedPlan(null);
      }
    } else {
      alert(res.error || 'Failed to delete the saved plan.');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getCategoryBadgeClass = (category) => {
    const c = (category || '').toLowerCase();
    if (c === 'temple') return 'bg-orange-500/15 text-orange-400 border-orange-400/30';
    if (c === 'beach') return 'bg-sky-500/15 text-sky-400 border-sky-400/30';
    if (c === 'heritage') return 'bg-amber-500/15 text-amber-400 border-amber-400/30';
    if (c === 'nature') return 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30';
    if (c === 'church_dargah') return 'bg-purple-500/15 text-purple-400 border-purple-400/30';
    return 'bg-slate-500/15 text-slate-400 border-slate-400/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px]" />
      </div>

      <TopBar active="my-trips" />

      <main className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fade-in flex-1">
        {/* ========================================================================= */}
        {/* VIEW 1: SAVED TRIPS LIST CARDS */}
        {/* ========================================================================= */}
        {!selectedPlan && (
          <div className="space-y-6">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <span>🧭</span>
                  <span>{t('myTrips.title', 'My Saved Trips')}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {t('myTrips.subtitle', 'Access and review your saved Ramanathapuram itineraries anytime.')}
                </p>
              </div>
              <button
                onClick={() => navigate('/plan')}
                className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 hover:from-amber-300 hover:to-orange-300 shadow-md shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>{t('myTrips.planNewTrip', 'Plan New Trip')}</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-3 text-xs text-red-200">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadSavedPlans}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 animate-pulse">
                    <div className="h-5 bg-slate-800 rounded-full w-3/4" />
                    <div className="h-3 bg-slate-800/60 rounded-full w-1/2" />
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="h-8 bg-slate-800/40 rounded-xl" />
                      <div className="h-8 bg-slate-800/40 rounded-xl" />
                    </div>
                    <div className="h-9 bg-slate-800/80 rounded-xl pt-2" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && plans.length === 0 && (
              <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-white/10 space-y-4 max-w-lg mx-auto my-12">
                <div className="flex justify-center mb-2">
                  <Mascot pose="pointing" size={76} animate={true} />
                </div>
                <h3 className="text-base font-bold text-white">{t('myTrips.emptyTitle', 'No saved trips yet')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('myTrips.emptyDesc', 'You haven\'t saved any itineraries yet. Generate a plan and click "Save this plan" to keep it safe for your journey.')}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/plan')}
                    className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                  >
                    {t('myTrips.planTripButton', 'Generate a Trip Plan')}
                  </button>
                </div>
              </div>
            )}

            {/* Saved Plans Grid */}
            {!loading && !error && plans.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((item) => {
                  const hasAiTips = Boolean(item.narration && item.narration.overview);
                  const days = item.days_count || item.plan?.days?.length || 2;
                  const stops = item.stops_count || 0;
                  const budgetNum = item.budget || item.trip?.budget || 0;

                  return (
                    <div
                      key={item.plan_id}
                      className="bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-orange-400/40 rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-xl flex flex-col justify-between space-y-4 group"
                    >
                      {/* Top Header & Date */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 text-slate-400">
                            <span>📅</span>
                            <span>{formatDate(item.created_at)}</span>
                          </span>
                          {hasAiTips && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                              ✨ AI Tips
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 text-center">
                        <div className="p-2 rounded-xl bg-white/5">
                          <span className="text-[10px] text-slate-400 block">{t('time.partySummary', 'Duration')}</span>
                          <span className="text-xs font-bold text-white">{days} {t('common.days')}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5">
                          <span className="text-[10px] text-slate-400 block">{t('time.savedBudget', 'Budget')}</span>
                          <span className="text-xs font-bold text-amber-300">
                            ₹{Number(budgetNum).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5">
                          <span className="text-[10px] text-slate-400 block">{t('destinations.selectedCount', 'Stops')}</span>
                          <span className="text-xs font-bold text-sky-300">{stops} {t('destinations.selectedCount')}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSelectedPlan(item);
                            setActiveDayIndex(0);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
                        >
                          {t('myTrips.openPlan', 'Open Plan')}
                        </button>

                        <button
                          onClick={() => setConfirmDeletePlan(item)}
                          className="p-2 rounded-xl text-xs text-slate-400 hover:text-red-300 hover:bg-red-500/15 border border-white/10 hover:border-red-400/30 transition-all cursor-pointer"
                          title={t('common.delete', 'Delete')}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: OPENED SAVED TRIP DETAIL VIEW */}
        {/* ========================================================================= */}
        {selectedPlan && (
          <div className="space-y-6">
            {/* Top Navigation & Action Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
              <button
                onClick={() => setSelectedPlan(null)}
                className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
              >
                <span>←</span>
                <span>Back to All Saved Trips</span>
              </button>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() =>
                    generatePlanPdf({
                      plan: selectedPlan.plan,
                      trip: selectedPlan.trip,
                      narration: selectedPlan.narration,
                      customTitle: selectedPlan.title,
                    })
                  }
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-sky-200 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 hover:border-sky-300 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>📄</span>
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => setConfirmDeletePlan(selectedPlan)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Trip Title & Subheader */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {selectedPlan.title}
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Saved on {formatDate(selectedPlan.created_at)}
              </p>
            </div>

            {/* AI Overview Card (if present) */}
            {selectedPlan.narration?.overview && (
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-orange-950/50 via-slate-900/90 to-sky-950/50 border border-orange-400/35 shadow-xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-orange-300">
                      Solvane AI Trip Overview
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30">
                    Saved AI tips
                  </span>
                </div>
                <p className="text-sm text-slate-100 leading-relaxed font-medium">
                  {selectedPlan.narration.overview}
                </p>
              </div>
            )}

            {/* Day Tabs */}
            {selectedPlan.plan?.days && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {selectedPlan.plan.days.map((dayObj, idx) => {
                    const isActive = activeDayIndex === idx;
                    const isFree = dayObj.is_free_day || !dayObj.stops || dayObj.stops.length === 0;
                    return (
                      <button
                        key={dayObj.day}
                        onClick={() => setActiveDayIndex(idx)}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                          isActive
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                            : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-orange-400/40 hover:bg-slate-850'
                        }`}
                      >
                        <span>Day {dayObj.day}</span>
                        <span className="text-[10px] opacity-75">
                          {isFree ? '(Free day)' : `(${dayObj.stops?.length || 0} stops)`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Day Content */}
                {selectedPlan.plan.days[activeDayIndex] && (() => {
                  const day = selectedPlan.plan.days[activeDayIndex];
                  const dayNarration = selectedPlan.narration?.days?.find(
                    (d) => Number(d.day) === Number(day.day)
                  );

                  return (
                    <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                      {/* Day Header */}
                      <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-white">
                            {day.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-300 mt-1">
                            {day.zone_summary}
                          </p>
                        </div>
                        {day.stops && day.stops.length > 0 && (
                          <button
                            onClick={() =>
                              navigate('/map', {
                                state: {
                                  routeStops: day.stops,
                                  dayNumber: day.day,
                                  dayTitle: day.title,
                                },
                              })
                            }
                            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-md shadow-sky-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-sky-400/30 whitespace-nowrap"
                          >
                            <span>🗺️</span>
                            <span>Show on Map</span>
                          </button>
                        )}
                      </div>

                      {/* Day Summary from AI Narration */}
                      {dayNarration?.summary && (
                        <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-400/25 text-xs text-orange-200 flex items-start gap-2.5 animate-fade-in shadow-inner">
                          <span className="text-sm shrink-0">✨</span>
                          <p className="leading-relaxed font-medium">{dayNarration.summary}</p>
                        </div>
                      )}

                      {/* Free Day or Timeline Stops */}
                      {day.is_free_day || !day.stops || day.stops.length === 0 ? (
                        <div className="bg-slate-950/60 border border-amber-400/20 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                          <div className="text-4xl">🌴</div>
                          <h3 className="text-lg font-bold text-white">Free Day / Flexible Time</h3>
                          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                            {day.note || 'We have limited places for this many days. You can add more destinations or keep these as flexible days to relax at your hotel, explore local bazaars, or revisit your favorite beach or temple.'}
                          </p>
                          {day.lunch_note && (
                            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                              <span>🍲</span>
                              <span>{day.lunch_note}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-orange-500 before:via-sky-500 before:to-orange-500">
                          {day.stops?.map((stop) => {
                          const isMissingImg = failedThumbnails[stop.place_id];
                          const badgeClass = getCategoryBadgeClass(stop.category);
                          const stopNarration = dayNarration?.stops?.find(
                            (s) => String(s.place_id || '').toLowerCase() === String(stop.place_id || '').toLowerCase()
                          );

                          return (
                            <div key={stop.place_id} className="relative group">
                              <div className="absolute -left-6 sm:-left-8 top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-orange-400 shadow-md" />

                              {stop.travel_minutes_from_previous > 0 && (
                                <div className="mb-3 text-[11px] font-semibold text-sky-300 bg-sky-950/60 border border-sky-400/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                                  <span>🚗</span>
                                  <span>{stop.travel_minutes_from_previous} mins travel</span>
                                  {stop.distance_km_from_previous && (
                                    <span>({stop.distance_km_from_previous} km)</span>
                                  )}
                                </div>
                              )}

                              <div className="bg-slate-950/60 hover:bg-slate-950 border border-white/10 hover:border-orange-400/40 rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <Link
                                  to={`/place/${stop.place_id}`}
                                  className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative group/thumb cursor-pointer"
                                >
                                  {!isMissingImg ? (
                                    <img
                                      src={stop.image}
                                      alt={stop.name}
                                      onError={() => handleImageError(stop.place_id)}
                                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-sky-900 to-blue-950 flex items-center justify-center text-xl">
                                      🌊
                                    </div>
                                  )}
                                </Link>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-orange-400">
                                      {stop.start_time} - {stop.end_time}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} capitalize`}>
                                      {stop.category}
                                    </span>
                                  </div>

                                  <Link
                                    to={`/place/${stop.place_id}`}
                                    className="text-base font-bold text-white hover:text-sky-300 transition-colors block truncate"
                                  >
                                    {stop.name}
                                  </Link>

                                  {stop.note && (
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                      {stop.note}
                                    </p>
                                  )}

                                  {/* AI Tips for this stop */}
                                  {stopNarration && (
                                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5 text-xs">
                                      {stopNarration.why_visit && (
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-[11px] font-bold text-amber-400 shrink-0">Why visit:</span>
                                          <span className="text-slate-200 leading-snug">{stopNarration.why_visit}</span>
                                        </div>
                                      )}
                                      {stopNarration.local_tip && (
                                        <div className="flex items-start gap-1.5">
                                          <span className="text-[11px] font-bold text-sky-400 shrink-0">Local tip:</span>
                                          <span className="text-slate-300 leading-snug">{stopNarration.local_tip}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Budget Breakdown Card */}
            {selectedPlan.plan?.budget && (
              <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>💰</span>
                  <span>Estimated Budget Breakdown</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 block mb-1">Stay / Rooms</span>
                    <span className="text-base font-bold text-white">
                      ₹{Number(selectedPlan.plan.budget.breakdown?.stay || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 block mb-1">Food & Dining</span>
                    <span className="text-base font-bold text-white">
                      ₹{Number(selectedPlan.plan.budget.breakdown?.food || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 block mb-1">Transport</span>
                    <span className="text-base font-bold text-white">
                      ₹{Number(selectedPlan.plan.budget.breakdown?.transport || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-slate-400 block mb-1">Entry Fees</span>
                    <span className="text-base font-bold text-white">
                      ₹{Number(selectedPlan.plan.budget.breakdown?.entry_fees || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300">
                  <span>
                    Total Cost: <strong className="text-white text-sm">₹{Number(selectedPlan.plan.budget.total || 0).toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="capitalize text-emerald-400 font-semibold">
                    Status: {selectedPlan.plan.budget.status || 'Within Budget'}
                  </span>
                </div>
              </div>
            )}

            {/* AI Advisories Cards: Packing & Safety */}
            {selectedPlan.narration && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPlan.narration.packing_tips && selectedPlan.narration.packing_tips.length > 0 && (
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <span>🎒</span>
                      <span>Packing Tips</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {selectedPlan.narration.packing_tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-400">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPlan.narration.safety_notes && selectedPlan.narration.safety_notes.length > 0 && (
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>Safety & Timing Notes</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {selectedPlan.narration.safety_notes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-sky-400">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Deletion */}
      {confirmDeletePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-3xl text-center">🗑️</div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">{t('myTrips.confirmDelete', 'Delete Trip Plan?')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isTamil ? `"${confirmDeletePlan.title}" திட்டத்தை நிச்சயமாக நீக்க விரும்புகிறீர்களா? இதை மீட்டெடுக்க முடியாது.` : `Are you sure you want to delete "${confirmDeletePlan.title}"? This cannot be undone.`}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmDeletePlan(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={Boolean(deletingId)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/30 transition-all cursor-pointer"
              >
                {deletingId ? (isTamil ? 'நீக்கப்படுகிறது...' : 'Deleting...') : t('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Watermark */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-400 border-t border-white/5">
        Ramanathapuram AI Heritage Companion • Solvane
      </footer>

      <FloatingChatButton />
    </div>
  );
}
