import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { clearSession } from '../services/api';

/**
 * Solvane - Travel Duration & Preferences Page ("/time")
 * Step 2: Allows user to configure duration, companions, and interests.
 */
export default function Time() {
  const navigate = useNavigate();
  const { trip, updateTrip } = useTrip();

  // Pre-fill state from TripContext or defaults
  const [selectedDays, setSelectedDays] = useState(trip?.days || 2);
  const [selectedParty, setSelectedParty] = useState(trip?.travellingWith || 'family');
  const [selectedInterests, setSelectedInterests] = useState(trip?.interests || ['temple', 'beach']);

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((i) => i !== interestId) : [...prev, interestId]
    );
  };

  const handleContinue = () => {
    updateTrip({
      days: selectedDays,
      travellingWith: selectedParty,
      interests: selectedInterests
    });
    navigate('/destinations');
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none overflow-hidden">
      
      {/* Blurred Ramanathapuram Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105"
        style={{ backgroundImage: "url('/images/slide1.jpg')" }}
      />
      
      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-950/85" />

      {/* Top Bar with SOLVANE logo and Logout */}
      <header className="relative z-30 pt-4 pb-2 px-6 sm:px-12 flex items-center justify-between border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-orange-400">
            SOLVANE
          </span>
          <span className="text-[10px] font-semibold text-sky-200/70 border border-sky-400/20 px-2 py-0.5 rounded-full hidden sm:inline">
            Ramanathapuram
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/destinations"
            className="text-xs font-semibold text-sky-300 hover:text-white transition-colors px-2.5 py-1 rounded-full hover:bg-white/10"
          >
            Destinations
          </Link>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Centered Content Card */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-3xl p-8 sm:p-10 shadow-2xl text-center animate-fade-in">
          
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-3xl shadow-inner">
            ⏳
          </div>

          <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">
            Step 2 of 4 • Travel Duration
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
            Trip Preferences
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            Choose your travel duration, companions, and interests for Ramanathapuram.
          </p>

          {/* Interactive Sections */}
          <div className="text-left space-y-5 mb-6">
            
            {/* Section A: How much time do you have? */}
            <div>
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                Section A: How much time do you have?
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: 'half', label: 'Half Day' },
                  { id: 1, label: '1 Day' },
                  { id: 2, label: '2 Days' },
                  { id: 3, label: '3 Days' },
                  { id: 4, label: '4 Days' }
                ].map((opt) => {
                  const isSelected = selectedDays === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedDays(opt.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                          : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-orange-400/40 hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: Who are you travelling with? */}
            <div>
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                Section B: Who are you travelling with?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'solo', label: 'Solo', icon: '🎒' },
                  { id: 'friends', label: 'Friends', icon: '👥' },
                  { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
                  { id: 'seniors', label: 'Seniors', icon: '🧓' }
                ].map((opt) => {
                  const isSelected = selectedParty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedParty(opt.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                          : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-orange-400/40 hover:bg-slate-800'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section C: What are you interested in? */}
            <div>
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                Section C: What are you interested in?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'temple', label: 'Temples', icon: '🛕' },
                  { id: 'beach', label: 'Beaches', icon: '🏖️' },
                  { id: 'heritage', label: 'Heritage', icon: '🏛️' },
                  { id: 'nature', label: 'Nature', icon: '🌴' }
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
                          : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-sky-400/40 hover:bg-slate-800'
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

          {/* Summary Bar: Current Saved Budget Indicator */}
          <div className="mb-6 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 text-xs text-slate-300 flex justify-between items-center">
            <span>Your saved trip budget:</span>
            <span className="font-bold text-orange-400 text-sm">
              ₹{Number(trip?.budget || 5000).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              Continue to Destinations →
            </button>

            {/* Back Button */}
            <button
              onClick={() => navigate('/budget')}
              className="w-full py-2.5 rounded-full font-semibold text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              ← Back to Budget Page
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-20 py-3 text-center text-[11px] text-slate-400">
        Ramanathapuram AI Heritage Companion • Solvane
      </footer>
    </div>
  );
}
