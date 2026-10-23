import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrip } from '../context/TripContext';
import { clearSession } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

/**
 * Solvane - Travel Duration & Preferences Page ("/time")
 * Step 2: Allows user to configure duration (up to 14 days), companions & travellers count, and interests.
 */
export default function Time() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { trip, updateTrip } = useTrip();

  // Normalize initial days
  const initialDays = trip?.days || 2;
  const [selectedDays, setSelectedDays] = useState(initialDays);
  const [showMoreDays, setShowMoreDays] = useState(
    typeof initialDays === 'number' && initialDays >= 4
  );

  // Travel companion party
  const [selectedParty, setSelectedParty] = useState(trip?.travellingWith || 'family');

  // Travellers breakdown: { adults, children, seniors }
  const [travellers, setTravellers] = useState(() => {
    const raw = trip?.travellers;
    if (trip?.travellingWith === 'solo') {
      return { adults: 1, children: 0, seniors: 0 };
    }
    if (typeof raw === 'number') {
      return { adults: Math.max(1, raw), children: 0, seniors: 0 };
    }
    if (raw && typeof raw === 'object') {
      return {
        adults: Math.max(1, Number(raw.adults) || 2),
        children: Math.max(0, Number(raw.children) || 0),
        seniors: Math.max(0, Number(raw.seniors) || 0)
      };
    }
    return { adults: 2, children: 0, seniors: 0 };
  });

  // Interests
  const [selectedInterests, setSelectedInterests] = useState(trip?.interests || ['temple', 'beach']);
  const [validationError, setValidationError] = useState('');

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((i) => i !== interestId) : [...prev, interestId]
    );
  };

  // Days stepper handlers
  const handleDaysStepper = (delta) => {
    const current = typeof selectedDays === 'number' ? selectedDays : 4;
    const next = Math.max(4, Math.min(14, current + delta));
    setSelectedDays(next);
    setShowMoreDays(true);
    setValidationError('');
  };

  const handleDaysInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setSelectedDays(4);
      return;
    }
    if (val < 4) {
      setSelectedDays(4);
    } else if (val > 14) {
      setSelectedDays(14);
      setValidationError(t('time.validation.daysRange', { defaultValue: 'Maximum trip duration is 14 days.' }));
    } else {
      setSelectedDays(val);
      setValidationError('');
    }
  };

  // Travellers update handlers
  const updateAdults = (delta) => {
    setTravellers((prev) => {
      const nextAdults = Math.max(1, Math.min(20, prev.adults + delta));
      const maxSeniors = nextAdults + prev.children;
      return {
        ...prev,
        adults: nextAdults,
        seniors: Math.min(prev.seniors, maxSeniors)
      };
    });
    setValidationError('');
  };

  const updateChildren = (delta) => {
    setTravellers((prev) => {
      const nextChildren = Math.max(0, Math.min(10, prev.children + delta));
      return {
        ...prev,
        children: nextChildren
      };
    });
    setValidationError('');
  };

  const updateSeniors = (delta) => {
    setTravellers((prev) => {
      const totalPeople = prev.adults + prev.children;
      const nextSeniors = Math.max(0, Math.min(totalPeople, prev.seniors + delta));
      return {
        ...prev,
        seniors: nextSeniors
      };
    });
    setValidationError('');
  };

  // Party selection handler
  const handlePartySelect = (partyId) => {
    setSelectedParty(partyId);
    setValidationError('');
    if (partyId === 'solo') {
      setTravellers({ adults: 1, children: 0, seniors: 0 });
    } else if (partyId === 'seniors') {
      setTravellers((prev) => ({
        ...prev,
        adults: Math.max(1, prev.adults),
        seniors: Math.max(1, prev.seniors || prev.adults)
      }));
    }
  };

  // Total people calculation
  const totalPeople = selectedParty === 'solo' ? 1 : travellers.adults + travellers.children;

  const handleContinue = () => {
    // Validation
    if (selectedParty !== 'solo') {
      if (travellers.adults < 1 || travellers.adults > 20) {
        setValidationError(t('time.validation.adultsRange', { defaultValue: 'Adult travellers must be between 1 and 20.' }));
        return;
      }
      if (travellers.children < 0 || travellers.children > 10) {
        setValidationError(t('time.validation.childrenRange', { defaultValue: 'Children must be between 0 and 10.' }));
        return;
      }
      if (selectedParty === 'seniors' && travellers.seniors > totalPeople) {
        setValidationError(t('time.validation.seniorsMax', { defaultValue: 'Seniors count cannot exceed total travellers.' }));
        return;
      }
    }

    if (showMoreDays) {
      if (typeof selectedDays !== 'number' || selectedDays < 4 || selectedDays > 14) {
        setValidationError(t('time.validation.daysRange', { defaultValue: 'Please select between 4 and 14 days.' }));
        return;
      }
    }

    const finalTravellers =
      selectedParty === 'solo'
        ? { adults: 1, children: 0, seniors: 0 }
        : {
            adults: travellers.adults,
            children: travellers.children,
            seniors: selectedParty === 'seniors' ? travellers.seniors : 0
          };

    updateTrip({
      days: selectedDays,
      travellingWith: selectedParty,
      travellers: finalTravellers,
      interests: selectedInterests
    });
    navigate('/destinations');
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  // Format party label for summary bar
  const partyKeyMap = {
    solo: t('time.solo', { defaultValue: 'Solo' }),
    friends: t('time.friends', { defaultValue: 'Friends' }),
    family: t('time.family', { defaultValue: 'Family' }),
    seniors: t('time.seniors', { defaultValue: 'Seniors' })
  };
  const partyDisplay = partyKeyMap[selectedParty] || selectedParty;
  const personUnit = totalPeople === 1 ? t('common.person', { defaultValue: 'person' }) : t('common.people', { defaultValue: 'people' });
  const partySummary =
    selectedParty === 'solo'
      ? t('time.soloPerson', { defaultValue: 'Solo traveller (1 person)' })
      : `${partyDisplay}, ${totalPeople} ${personUnit}`;

  const isMoreDaysActive = showMoreDays && typeof selectedDays === 'number' && selectedDays >= 4;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none overflow-x-hidden">
      {/* Blurred Ramanathapuram Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />

      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-950/85" />

      {/* Top Bar with SOLVANE logo and Logout */}
      <header className="relative z-30 pt-4 pb-2 px-4 sm:px-12 flex items-center justify-between border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
              {t('common.brand', { defaultValue: 'SOLVANE' })}
            </span>
            <span className="text-[10px] font-semibold text-sky-200/70 border border-sky-400/20 px-2 py-0.5 rounded-full hidden sm:inline">
              {t('common.district', { defaultValue: 'Ramanathapuram' })}
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/destinations"
            className="text-xs font-semibold text-sky-300 hover:text-white transition-colors px-2.5 py-1 rounded-full hover:bg-white/10"
          >
            {t('common.destinations', { defaultValue: 'Destinations' })}
          </Link>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer whitespace-nowrap"
          >
            {t('common.logout', { defaultValue: 'Logout' })}
          </button>
        </div>
      </header>

      {/* Centered Content Card */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-center animate-fade-in my-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-2xl shadow-inner">
            ⏳
          </div>

          <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">
            {t('time.step', { defaultValue: 'Step 2 of 4 • Travel Duration & Party' })}
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
            {t('time.title', { defaultValue: 'Trip Preferences' })}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            {t('time.subtitle', { defaultValue: 'Choose your duration, travelling party, and favorite interests.' })}
          </p>

          {/* Interactive Sections */}
          <div className="text-left space-y-6 mb-6">
            {/* Section A: How much time do you have? */}
            <div>
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                {t('time.sectionA', { defaultValue: 'Section A: How much time do you have?' })}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: 'half', label: t('time.halfDay', { defaultValue: 'Half Day' }) },
                  { id: 1, label: t('time.oneDay', { defaultValue: '1 Day' }) },
                  { id: 2, label: t('time.twoDays', { defaultValue: '2 Days' }) },
                  { id: 3, label: t('time.threeDays', { defaultValue: '3 Days' }) }
                ].map((opt) => {
                  const isSelected = !showMoreDays && selectedDays === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedDays(opt.id);
                        setShowMoreDays(false);
                        setValidationError('');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                          : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-orange-400/40 hover:bg-slate-850'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}

                {/* More Days Quick Card */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDays(true);
                    if (typeof selectedDays !== 'number' || selectedDays < 4) {
                      setSelectedDays(4);
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    isMoreDaysActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                      : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-orange-400/40 hover:bg-slate-850'
                  }`}
                >
                  {isMoreDaysActive ? `${selectedDays} ${t('common.days', { defaultValue: 'Days' })}` : t('time.moreDays', { defaultValue: 'More days' })}
                </button>
              </div>

              {/* Stepper for 4 to 14 days */}
              {showMoreDays && (
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/70 border border-orange-500/30 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {t('time.customDurationTitle', { defaultValue: 'Select Custom Duration' })}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {t('time.customDurationSub', { defaultValue: 'Choose between 4 and 14 days' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDaysStepper(-1)}
                        disabled={selectedDays <= 4}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="4"
                        max="14"
                        value={selectedDays}
                        onChange={handleDaysInput}
                        className="w-14 text-center py-1 bg-slate-900 border border-orange-400/50 rounded-lg text-sm font-bold text-white focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleDaysStepper(1)}
                        disabled={selectedDays >= 14}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {selectedDays > 4 && (
                    <p className="text-[11px] text-amber-300 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 leading-tight">
                      ℹ️ {t('time.moreDaysNote', { defaultValue: 'Note: Solvane arranges all top attractions in early days. Extra days are kept as flexible free time while estimating stay and meal expenses.' })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Section B: Who are you travelling with? */}
            <div>
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                {t('time.sectionB', { defaultValue: 'Section B: Who are you travelling with?' })}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'solo', label: t('time.solo', { defaultValue: 'Solo' }), icon: '🎒' },
                  { id: 'friends', label: t('time.friends', { defaultValue: 'Friends' }), icon: '👥' },
                  { id: 'family', label: t('time.family', { defaultValue: 'Family' }), icon: '👨‍👩‍👧‍👦' },
                  { id: 'seniors', label: t('time.seniors', { defaultValue: 'Seniors' }), icon: '🧓' }
                ].map((opt) => {
                  const isSelected = selectedParty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePartySelect(opt.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                          : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-orange-400/40 hover:bg-slate-850'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Section B.2: How many people are travelling? (Visible for Family, Friends, Seniors) */}
              {selectedParty !== 'solo' && (
                <div className="mt-3.5 p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {t('time.adultsLabel', { defaultValue: 'Adults (Age 12+)' })}
                      </span>
                      <span className="text-[11px] text-slate-400">{t('time.adultsSub', { defaultValue: '1 to 20 adults' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateAdults(-1)}
                        disabled={travellers.adults <= 1}
                        className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10 text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-sky-300">
                        {travellers.adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateAdults(1)}
                        disabled={travellers.adults >= 20}
                        className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children Stepper */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {t('time.childrenLabel', { defaultValue: 'Children (Under 12)' })}
                      </span>
                      <span className="text-[11px] text-slate-400">{t('time.childrenSub', { defaultValue: '0 to 10 children' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateChildren(-1)}
                        disabled={travellers.children <= 0}
                        className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10 text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-sky-300">
                        {travellers.children}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateChildren(1)}
                        disabled={travellers.children >= 10}
                        className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Seniors Count (if Seniors party selected) */}
                  {selectedParty === 'seniors' && (
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs font-bold text-orange-300 block">
                          {t('time.seniorsLabel', { defaultValue: 'Seniors in Group' })}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {t('time.seniorsSub', { defaultValue: 'Senior citizens (pacing adjusted)' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateSeniors(-1)}
                          disabled={travellers.seniors <= 0}
                          className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10 text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-orange-400">
                          {travellers.seniors}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateSeniors(1)}
                          disabled={travellers.seniors >= totalPeople}
                          className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/10 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section C: What are you interested in? */}
            <div>
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                {t('time.sectionC', { defaultValue: 'Section C: What are you interested in?' })}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'temple', label: t('time.temples', { defaultValue: 'Temples' }), icon: '🛕' },
                  { id: 'beach', label: t('time.beaches', { defaultValue: 'Beaches' }), icon: '🏖️' },
                  { id: 'heritage', label: t('time.heritage', { defaultValue: 'Heritage' }), icon: '🏛️' },
                  { id: 'nature', label: t('time.nature', { defaultValue: 'Nature' }), icon: '🌴' }
                ].map((opt) => {
                  const isSelected = selectedInterests.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleInterest(opt.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-200 border-sky-400 shadow-md shadow-sky-500/20'
                          : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-sky-400/40 hover:bg-slate-850'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs text-left flex items-center gap-2">
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Summary Bar */}
          <div className="mb-6 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 text-xs text-slate-300 space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{t('time.partySummary', { defaultValue: 'Party & Group size:' })}</span>
              <span className="font-bold text-sky-300">{partySummary}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
              <span className="text-slate-400">
                {t('time.savedBudget', { defaultValue: 'Budget' })} ({trip?.budgetBasis === 'person' ? t('budget.perPerson', { defaultValue: 'Per person' }) : t('budget.wholeGroup', { defaultValue: 'Whole group' })}):
              </span>
              <span className="font-bold text-orange-400 text-sm">
                ₹{Number(trip?.budget || 5000).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              {t('time.continueDestinations', { defaultValue: 'Continue to Destinations →' })}
            </button>

            {/* Back Button */}
            <button
              onClick={() => navigate('/budget')}
              className="w-full py-2.5 rounded-full font-semibold text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              {t('time.backToBudget', { defaultValue: '← Back to Budget Page' })}
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-20 py-3 text-center text-[11px] text-slate-400">
        {t('common.watermark', { defaultValue: 'Ramanathapuram AI Heritage Companion • Solvane' })}
      </footer>
    </div>
  );
}
