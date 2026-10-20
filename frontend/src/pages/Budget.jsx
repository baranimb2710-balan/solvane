import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUser, clearSession } from '../services/api';
import { useTrip } from '../context/TripContext';

/**
 * Solvane - Budget Planning Page ("/budget")
 * 
 * Features:
 * 1. Top bar with SOLVANE logo and Logout button.
 * 2. Greeting: "Welcome, <username>!"
 * 3. Subheading: "Tell us your total trip budget and we will plan accordingly."
 * 4. Large display of selected amount formatted in Indian rupees (e.g. ₹5,000).
 * 5. Dynamic category label:
 *    - < 3,000: "Budget trip"
 *    - 3,000 - 10,000: "Comfortable trip"
 *    - > 10,000: "Premium trip"
 * 6. Interactive slider: 1,000 to 50,000 with step 500.
 * 7. Quick-select chips: 2,000, 5,000, 10,000, 20,000, 50,000.
 * 8. Exact amount text input with validation (numbers only, min 1,000, max 100,000).
 * 9. Slider, chips, and text input stay synchronized.
 * 10. Pre-fills previous choice from shared trip state (TripContext) / localStorage.
 * 11. "Continue" button saving budget and navigating to "/time".
 */

// Quick-select preset options
const QUICK_BUDGET_CHIPS = [2000, 5000, 10000, 20000, 50000];

export default function Budget() {
  const navigate = useNavigate();
  const user = getUser();
  const username = user?.username || 'Explorer';

  const { trip, setBudget } = useTrip();

  // Local state for the budget amount (pre-filled from TripContext/localStorage)
  const [amount, setAmount] = useState(trip?.budget || 5000);

  // Text input string state to allow easy typing
  const [textInput, setTextInput] = useState(String(trip?.budget || 5000));

  // Error message state for manual input validation
  const [inputError, setInputError] = useState('');

  // Determine budget trip category label and color
  const getBudgetCategory = (val) => {
    if (val < 3000) {
      return {
        label: 'Budget trip',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
        desc: 'Economical guesthouses, local street food & state buses.'
      };
    } else if (val <= 10000) {
      return {
        label: 'Comfortable trip',
        badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
        desc: 'AC hotel stays, popular dining & comfortable taxi transit.'
      };
    } else {
      return {
        label: 'Premium trip',
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
        desc: 'Luxury beachfront resorts, private cab tours & fine seafood feasts.'
      };
    }
  };

  const category = getBudgetCategory(amount);

  // Format number into Indian comma system (e.g. 5,000, 1,00,000)
  const formatIndianCurrency = (num) => {
    return Number(num).toLocaleString('en-IN');
  };

  // Synchronize when slider changes
  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setAmount(val);
    setTextInput(String(val));
    setInputError('');
  };

  // Synchronize when a quick-select chip is clicked
  const handleChipClick = (chipVal) => {
    setAmount(chipVal);
    setTextInput(String(chipVal));
    setInputError('');
  };

  // Synchronize and validate when text input changes
  const handleTextInputChange = (e) => {
    const valStr = e.target.value;
    setTextInput(valStr);

    // Validate numbers only
    if (!/^\d*$/.test(valStr)) {
      setInputError('Please enter numbers only.');
      return;
    }

    if (valStr === '') {
      setInputError('Please enter an amount.');
      return;
    }

    const numericVal = Number(valStr);
    if (numericVal < 1000) {
      setInputError('Minimum trip budget is ₹1,000.');
    } else if (numericVal > 100000) {
      setInputError('Maximum trip budget is ₹1,00,000.');
    } else {
      setInputError('');
      setAmount(numericVal);
    }
  };

  // Handle Continue button click
  const handleContinue = () => {
    if (inputError || amount < 1000 || amount > 100000) {
      return;
    }
    // Save to shared TripContext (which also updates localStorage "Solvane_trip")
    setBudget(amount);
    // Navigate to /time
    navigate('/time');
  };

  // Handle Logout
  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white select-none overflow-x-hidden">
      
      {/* Blurred Ramanathapuram Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center filter blur-md scale-105"
        style={{ backgroundImage: "url('/images/slide3.jpg')" }}
      />
      
      {/* Dark overlay for contrast */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-slate-950/90 via-slate-900/75 to-slate-950/85" />

      {/* ========================================================================= */}
      {/* 1. TOP BAR WITH SOLVANE BRANDING & LOGOUT BUTTON */}
      {/* ========================================================================= */}
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
          {/* Small top bar Logout button */}
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CENTERED CARD: BUDGET SELECTION */}
      {/* ========================================================================= */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in text-center">
          
          {/* Greeting & Header */}
          <div className="mb-6">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">
              Step 1 of 4 • Trip Budget
            </span>
            <p className="text-sm font-semibold text-sky-300 mb-1">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-orange-400">{username}</span>!
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              What is your budget?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Tell us your total trip budget and we will plan accordingly.
            </p>
          </div>

          {/* Large Budget Amount Display */}
          <div className="my-5 p-4 rounded-2xl bg-slate-950/50 border border-white/10 flex flex-col items-center justify-center shadow-inner">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
              Selected Budget
            </span>
            <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-orange-400 tracking-tight">
              ₹{formatIndianCurrency(amount)}
            </div>

            {/* Dynamic Category Pill */}
            <div className="mt-3 flex flex-col items-center gap-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${category.badgeClass}`}>
                <span>✨</span>
                <span>{category.label}</span>
              </span>
              <span className="text-[11px] text-slate-400 italic mt-0.5">
                {category.desc}
              </span>
            </div>
          </div>

          {/* Interactive Range Slider (1,000 to 50,000, step 500) */}
          <div className="mt-6 mb-4 text-left">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-2">
              <span>Slider Adjustment</span>
              <span className="text-orange-400">Step: ₹500</span>
            </div>
            
            <input
              type="range"
              min="1000"
              max="50000"
              step="500"
              value={Math.min(50000, Math.max(1000, amount))}
              onChange={handleSliderChange}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
            />

            <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-semibold">
              <span>₹1,000</span>
              <span>₹25,000</span>
              <span>₹50,000</span>
            </div>
          </div>

          {/* Quick-Select Chips */}
          <div className="my-5 text-left">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Quick Select:
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_BUDGET_CHIPS.map((chipVal) => {
                const isSelected = amount === chipVal;
                return (
                  <button
                    key={chipVal}
                    type="button"
                    onClick={() => handleChipClick(chipVal)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/30 scale-105'
                        : 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-orange-400/50 hover:bg-slate-800'
                    }`}
                  >
                    ₹{formatIndianCurrency(chipVal)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Exact Amount Text Input */}
          <div className="my-5 text-left">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Or Type Exact Budget (₹):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="text"
                value={textInput}
                onChange={handleTextInputChange}
                placeholder="e.g. 7500"
                className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-sm bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                  inputError
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                    : 'border-white/15 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
                }`}
              />
            </div>
            
            {/* Inline validation error */}
            {inputError ? (
              <p className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">
                <span>⚠️</span>
                <span>{inputError}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                Allowed range: ₹1,000 to ₹1,00,000
              </p>
            )}
          </div>

          {/* Continue Button */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleContinue}
              disabled={Boolean(inputError) || amount < 1000 || amount > 100000}
              className={`w-full py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                !inputError && amount >= 1000 && amount <= 100000
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-95 cursor-pointer'
                  : 'bg-slate-700/60 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span>Continue to Travel Duration</span>
              <span>→</span>
            </button>
          </div>

        </div>
      </main>

      {/* Footer watermark */}
      <footer className="relative z-20 py-3 text-center text-[11px] text-slate-400">
        Ramanathapuram AI Heritage Companion • Solvane
      </footer>
    </div>
  );
}
