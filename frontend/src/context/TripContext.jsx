import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Solvane Trip Context
 * Shared trip state surviving page reloads via localStorage ("Solvane_trip").
 * Structure: { budget, days, travellingWith, interests }
 */

const STORAGE_KEY = 'Solvane_trip';

const defaultTripState = {
  budget: 5000,
  budgetBasis: 'group',
  days: null,
  travellingWith: null,
  travellers: { adults: 2, children: 0, seniors: 0 },
  interests: [],
  selectedPlaces: []
};

function normalizeTravellers(travellers, travellingWith) {
  if (travellingWith === 'solo') {
    return { adults: 1, children: 0, seniors: 0 };
  }
  if (typeof travellers === 'number') {
    return { adults: Math.max(1, travellers), children: 0, seniors: 0 };
  }
  if (travellers && typeof travellers === 'object') {
    return {
      adults: Math.max(1, Number(travellers.adults) || 2),
      children: Math.max(0, Number(travellers.children) || 0),
      seniors: Math.max(0, Number(travellers.seniors) || 0)
    };
  }
  return { adults: 2, children: 0, seniors: 0 };
}

const TripContext = createContext(null);

export function TripProvider({ children }) {
  const [trip, setTrip] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('solvane_trip');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultTripState,
          ...parsed,
          budget: parsed.budget || defaultTripState.budget,
          budgetBasis: parsed.budgetBasis || 'group',
          travellers: normalizeTravellers(parsed.travellers, parsed.travellingWith),
          selectedPlaces: Array.isArray(parsed.selectedPlaces) ? parsed.selectedPlaces : []
        };
      }
    } catch (e) {
      console.error('Error loading trip from localStorage:', e);
    }
    return defaultTripState;
  });

  // Keep localStorage in sync whenever trip changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
      localStorage.setItem('solvane_trip', JSON.stringify(trip));
    } catch (e) {
      console.error('Error saving trip to localStorage:', e);
    }
  }, [trip]);

  // Helper to set only budget
  const setBudget = (budgetAmount) => {
    setTrip((prev) => ({
      ...prev,
      budget: Number(budgetAmount)
    }));
  };

  // Helper to toggle a place in selectedPlaces
  const togglePlace = (placeId) => {
    setTrip((prev) => {
      const currentList = prev.selectedPlaces || [];
      const updated = currentList.includes(placeId)
        ? currentList.filter((id) => id !== placeId)
        : [...currentList, placeId];
      return {
        ...prev,
        selectedPlaces: updated
      };
    });
  };

  // Helper to directly set selectedPlaces array
  const setSelectedPlaces = (placesList) => {
    setTrip((prev) => ({
      ...prev,
      selectedPlaces: Array.isArray(placesList) ? placesList : []
    }));
  };

  // Helper to update any trip field
  const updateTrip = (updates) => {
    setTrip((prev) => ({
      ...prev,
      ...updates
    }));
  };

  return (
    <TripContext.Provider value={{ trip, setBudget, updateTrip, togglePlace, setSelectedPlaces }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
