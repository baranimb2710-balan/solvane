import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { generatePlan, clearSession } from '../services/api';
import TopBar from '../components/TopBar';
import FloatingChatButton from '../components/FloatingChatButton';

/**
 * Solvane - Rule-Based Plan Suggestion Page ("/plan")
 * 
 * Features:
 * 1. Checks required trip state; redirects to /budget or /time if missing.
 * 2. On load, calls POST /api/plan with current trip state.
 * 3. Trip summary chip row (Budget, Duration, Party, Interests).
 * 4. Day tabs with a rich vertical timeline:
 *    - Start/end times, thumbnails, destination links to /place/:id,
 *    - Travel duration & distance between stops,
 *    - Distinct timeline lunch item.
 * 5. Budget Summary Card with progress bar, breakdown (stay, food, transport, entry fees),
 *    and colored status (green, orange, red).
 * 6. Warnings highlight box and "Places that could not fit" with "Add a day" button.
 * 7. Action buttons: "Edit budget and time", "Change places", and "Regenerate".
 * 8. Loading skeletons and retry error banner.
 * 9. Mobile-first, responsive, temple-orange & sea-blue theme.
 */

export default function Plan() {
  const navigate = useNavigate();
  const { trip, updateTrip } = useTrip();

  // Planner state
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Track failed thumbnail images
  const [failedThumbnails, setFailedThumbnails] = useState({});

  const handleImageError = (placeId) => {
    setFailedThumbnails((prev) => ({ ...prev, [placeId]: true }));
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  // 1. Redirect if required trip data is missing
  useEffect(() => {
    if (!trip?.budget) {
      navigate('/budget', { replace: true });
      return;
    }
    if (!trip?.days) {
      navigate('/time', { replace: true });
      return;
    }
  }, [trip, navigate]);

  // 2. Fetch Plan from FastAPI Backend
  const fetchPlan = async (overrideDays = null) => {
    if (!trip?.budget) return;

    setLoading(true);
    setError('');

    const daysToUse = overrideDays !== null ? overrideDays : (trip.days || 2);

    const payload = {
      budget: Number(trip.budget),
      days: daysToUse,
      travellingWith: trip.travellingWith || 'family',
      interests: Array.isArray(trip.interests) ? trip.interests : [],
      selectedPlaces: Array.isArray(trip.selectedPlaces) ? trip.selectedPlaces : [],
      travellers: 2
    };

    const res = await generatePlan(payload);

    if (res.success && res.data) {
      setPlanData(res.data);
      if (activeDayIndex >= (res.data.days?.length || 1)) {
        setActiveDayIndex(0);
      }
    } else {
      setError(res.error || 'Failed to generate itinerary. Please try again.');
    }

    setLoading(false);
  };

  useEffect(() => {
    if (trip?.budget && trip?.days) {
      fetchPlan();
    }
  }, []);

  // Handler for "Add a day" button
  const handleAddDay = () => {
    let nextDays = 2;
    if (trip.days === 'half') {
      nextDays = 1;
    } else {
      const current = Number(trip.days) || 1;
      nextDays = Math.min(4, current + 1);
    }
    updateTrip({ days: nextDays });
    fetchPlan(nextDays);
  };

  // Helper for budget progress bar color
  const getBudgetStatusStyles = (status) => {
    switch (status) {
      case 'within budget':
        return {
          pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
          bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
          label: 'Within Budget'
        };
      case 'tight':
        return {
          pill: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
          bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
          label: 'Budget Tight'
        };
      case 'over budget':
      default:
        return {
          pill: 'bg-red-500/20 text-red-300 border-red-400/40',
          bar: 'bg-gradient-to-r from-red-500 to-orange-600',
          label: 'Over Budget'
        };
    }
  };

  // Category badge styling helper
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'temple':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
      case 'beach':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/30';
      case 'heritage':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
      case 'nature':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
      case 'church_dargah':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-white/10';
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none bg-slate-950 overflow-x-hidden pb-16">
      
      {/* Background Ambience */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105 opacity-20 pointer-events-none"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/90 pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP BAR */}
      {/* ========================================================================= */}
      <TopBar active="plan" />

      {/* ========================================================================= */}
      {/* 2. MAIN PLANNER CONTENT */}
      {/* ========================================================================= */}
      <main className="relative z-20 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-fade-in">
        
        {/* Header Title & Subtext */}
        <div className="text-center space-y-2">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-400">
            Step 4 of 4 • Optimized Itinerary
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Your Ramanathapuram Itinerary
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Organized geographically by zone to eliminate backtracking, with optimal temple darshan and beach sunset timings.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 3. TRIP SUMMARY CHIP ROW & ACTION BUTTONS */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Summary Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Budget Chip */}
            <span className="bg-slate-950/80 border border-white/15 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span>💰</span>
              <span>₹{Number(trip.budget || 5000).toLocaleString('en-IN')}</span>
            </span>

            {/* Days Chip */}
            <span className="bg-slate-950/80 border border-white/15 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span>📅</span>
              <span>{trip.days === 'half' ? 'Half Day' : `${trip.days} Days`}</span>
            </span>

            {/* Party Chip */}
            <span className="bg-slate-950/80 border border-white/15 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-200 flex items-center gap-1.5 capitalize">
              <span>👥</span>
              <span>{trip.travellingWith || 'Family'}</span>
            </span>

            {/* Interests Chips */}
            {Array.isArray(trip.interests) && trip.interests.length > 0 && (
              <span className="bg-slate-950/80 border border-sky-400/20 px-3 py-1.5 rounded-2xl text-xs font-semibold text-sky-300 flex items-center gap-1 capitalize">
                <span>✨</span>
                <span>{trip.interests.join(', ')}</span>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/budget')}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              Edit budget & time
            </button>
            <button
              onClick={() => navigate('/destinations')}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              Change places
            </button>
            <button
              onClick={() => fetchPlan()}
              disabled={loading}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-md hover:shadow-orange-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. ERROR BANNER & RETRY */}
        {/* ========================================================================= */}
        {error && (
          <div className="p-5 rounded-3xl bg-red-500/20 border border-red-400/40 text-center space-y-3">
            <p className="text-sm font-semibold text-red-200">⚠️ {error}</p>
            <button
              onClick={() => fetchPlan()}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer"
            >
              Retry Itinerary Generation
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. LOADING SKELETON */}
        {/* ========================================================================= */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-slate-900 rounded-2xl w-48" />
            <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 h-96" />
            <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 h-48" />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. PLAN CONTENT (WHEN LOADED) */}
        {/* ========================================================================= */}
        {!loading && !error && planData && (
          <>
            {/* WARNINGS NOTICES */}
            {Array.isArray(planData.warnings) && planData.warnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 space-y-1.5">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Travel Advisory & Timing Notes:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-amber-200/90 leading-relaxed">
                  {planData.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* DAY TABS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {planData.days?.map((dayObj, idx) => {
                  const isActive = activeDayIndex === idx;
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
                      <span className="text-[10px] opacity-75">({dayObj.stops?.length || 0} stops)</span>
                    </button>
                  );
                })}
              </div>

              {/* ACTIVE DAY TIMELINE */}
              {planData.days && planData.days[activeDayIndex] && (() => {
                const day = planData.days[activeDayIndex];

                return (
                  <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                    {/* Day Title & Zone Summary */}
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

                    {/* Vertical Timeline */}
                    <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-orange-500 before:via-sky-500 before:to-orange-500">
                      {day.stops?.map((stop, sIdx) => {
                        const isMissingImg = failedThumbnails[stop.place_id];
                        const badgeClass = getCategoryBadgeClass(stop.category);

                        return (
                          <div key={stop.place_id} className="relative group">
                            {/* Timeline Node Dot */}
                            <div className="absolute -left-6 sm:-left-8 top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-orange-400 shadow-md group-hover:scale-125 transition-transform" />

                            {/* Transit Distance from Previous Stop */}
                            {stop.travel_minutes_from_previous > 0 && (
                              <div className="mb-3 text-[11px] font-semibold text-sky-300 bg-sky-950/60 border border-sky-400/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                                <span>🚗</span>
                                <span>{stop.travel_minutes_from_previous} mins travel</span>
                                {stop.distance_km_from_previous && (
                                  <span>({stop.distance_km_from_previous} km)</span>
                                )}
                              </div>
                            )}

                            {/* Stop Card */}
                            <div className="bg-slate-950/60 hover:bg-slate-950 border border-white/10 hover:border-orange-400/40 rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              {/* Thumbnail */}
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

                              {/* Stop Details */}
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
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Distinct Lunch Timeline Item */}
                      {day.lunch_note && (
                        <div className="relative">
                          <div className="absolute -left-6 sm:-left-8 top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-amber-400 shadow-md" />
                          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-400/30 rounded-2xl p-3.5 flex items-center gap-3">
                            <span className="text-2xl">🍲</span>
                            <div>
                              <p className="text-xs font-bold text-amber-300">
                                Recommended Lunch Break
                              </p>
                              <p className="text-[11px] text-slate-300 mt-0.5">
                                {day.lunch_note}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ========================================================================= */}
            {/* 7. BUDGET SUMMARY CARD */}
            {/* ========================================================================= */}
            {planData.budget && (() => {
              const b = planData.budget;
              const statusStyle = getBudgetStatusStyles(b.status);
              const percentUsed = b.user_budget > 0 ? Math.min(100, Math.round((b.total / b.user_budget) * 100)) : 100;

              return (
                <section className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  {/* Card Title & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        <span>💳</span>
                        <span>Budget & Cost Breakdown</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Calculated for {b.travellers || 2} travellers ({b.nights} night accommodation)
                      </p>
                    </div>

                    <span className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-bold border ${statusStyle.pill} uppercase tracking-wider`}>
                      {statusStyle.label}
                    </span>
                  </div>

                  {/* Budget Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-300">
                        Estimated: ₹{b.total?.toLocaleString('en-IN')}
                      </span>
                      <span className="text-orange-400">
                        User Budget: ₹{b.user_budget?.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${statusStyle.bar}`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>

                  {/* Breakdown Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3.5">
                      <span className="text-[11px] text-slate-400 font-medium">🏨 Stay</span>
                      <p className="text-base font-bold text-white mt-0.5">
                        ₹{b.breakdown?.stay?.toLocaleString('en-IN') || 0}
                      </p>
                    </div>
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3.5">
                      <span className="text-[11px] text-slate-400 font-medium">🍽️ Food</span>
                      <p className="text-base font-bold text-white mt-0.5">
                        ₹{b.breakdown?.food?.toLocaleString('en-IN') || 0}
                      </p>
                    </div>
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3.5">
                      <span className="text-[11px] text-slate-400 font-medium">🚗 Transport</span>
                      <p className="text-base font-bold text-white mt-0.5">
                        ₹{b.breakdown?.transport?.toLocaleString('en-IN') || 0}
                      </p>
                    </div>
                    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3.5">
                      <span className="text-[11px] text-slate-400 font-medium">🎟️ Entry Fees</span>
                      <p className="text-base font-bold text-white mt-0.5">
                        ₹{b.breakdown?.entry_fees?.toLocaleString('en-IN') || 0}
                      </p>
                    </div>
                  </div>

                  {/* Advisory Message */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200 leading-relaxed">
                    💡 <span className="font-semibold text-white">Suggestion: </span>
                    {b.message}
                  </div>
                </section>
              );
            })()}

            {/* ========================================================================= */}
            {/* 8. PLACES THAT COULD NOT FIT & ADD A DAY BUTTON */}
            {/* ========================================================================= */}
            {Array.isArray(planData.could_not_fit) && planData.could_not_fit.length > 0 && (
              <section className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>⏳</span>
                      <span>Places That Could Not Fit</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      These selected destinations couldn't fit into the current duration without exhausting daily stops.
                    </p>
                  </div>

                  {/* Add a day button */}
                  {trip.days !== 4 && (
                    <button
                      onClick={handleAddDay}
                      className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                      + Add a Day
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {planData.could_not_fit.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.reason}</p>
                      </div>
                      <Link
                        to={`/place/${item.place_id}`}
                        className="text-xs font-bold text-sky-400 hover:text-sky-300 ml-2"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Disclaimer */}
            <div className="text-center text-xs text-slate-400 pt-2">
              Costs are estimates. Please verify before travelling.
            </div>
          </>
        )}

      </main>

      {/* Footer Watermark */}
      <footer className="relative z-20 py-4 text-center text-[11px] text-slate-400">
        Ramanathapuram AI Heritage Companion • Solvane
      </footer>

      {/* Floating Solvane AI Guide Launcher */}
      <FloatingChatButton />
    </div>
  );
}
