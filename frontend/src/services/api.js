/**
 * Solvane API & Authentication Helper
 * Manages HTTP communication between React and the FastAPI backend.
 * Handles automatic token attachment, session storage, and 401 handling.
 */

// Base URL from Vite environment variable (defaults to relative path for Vite dev proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Storage keys
const TOKEN_KEY = 'solvane_token';
const USER_KEY = 'solvane_user';

// -------------------------------------------------------------
// SESSION STORAGE HELPERS
// -------------------------------------------------------------
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Returns a fully usable image URL for frontend rendering.
 * Handles backend-served uploads (/uploads/...) and public static images (/images/...).
 */
export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  if (API_BASE_URL && path.startsWith('/uploads')) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}

// -------------------------------------------------------------
// AUTHENTICATED FETCH WRAPPER
// Automatically attaches Bearer token to headers.
// If backend returns 401, clears session and redirects to /login.
// -------------------------------------------------------------
export async function authFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
  };

  // Only set Content-Type to application/json if not uploading FormData and not already specified
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If server responds with 401 Unauthorized (expired or invalid token)
    if (response.status === 401) {
      clearSession();
      // Redirect to /login if we are not already on the login or signup page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }

    return response;
  } catch (err) {
    console.error('Network request failed:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// SIGNUP API CALL
// -------------------------------------------------------------
export async function signupUser(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json().catch(() => null);

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data && data.detail ? data.detail : 'Signup failed. Please check your information.';
      return { success: false, error: errorMessage, status: response.status };
    }
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

// -------------------------------------------------------------
// LOGIN API CALL
// -------------------------------------------------------------
export async function loginUser(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json().catch(() => null);

    if (response.ok) {
      // Store token and user details in localStorage
      setSession(data.access_token, data.user);
      return { success: true, data };
    } else {
      const errorMessage = data && data.detail ? data.detail : 'Invalid email or password';
      return { success: false, error: errorMessage, status: response.status };
    }
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

// -------------------------------------------------------------
// GET CURRENT USER PROFILE (/api/me)
// -------------------------------------------------------------
export async function getCurrentUser() {
  try {
    const response = await authFetch('/api/me');
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// GET PLACES LIST (/api/places)
// Supports optional category and subtype filters
// -------------------------------------------------------------
export async function getPlaces(category = null, subtype = null) {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') {
      params.append('category', category);
    }
    if (subtype && subtype !== 'all') {
      params.append('subtype', subtype);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await authFetch(`/api/places${query}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    const err = await response.json().catch(() => null);
    return {
      success: false,
      error: err?.detail || 'Failed to load destinations. Please try again.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

// -------------------------------------------------------------
// GET SINGLE PLACE DETAIL (/api/places/:id)
// -------------------------------------------------------------
export async function getPlaceById(id) {
  try {
    const response = await authFetch(`/api/places/${encodeURIComponent(id)}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    const err = await response.json().catch(() => null);
    return {
      success: false,
      error: err?.detail || 'Destination not found.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

// -------------------------------------------------------------
// HOTELS API HELPERS (/api/hotels)
// -------------------------------------------------------------
export async function getHotels(category = null) {
  try {
    const query = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    const response = await authFetch(`/api/hotels${query}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    const err = await response.json().catch(() => null);
    return {
      success: false,
      error: err?.detail || 'Failed to load hotels. Please try again.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

export async function getHotelById(id) {
  try {
    const response = await authFetch(`/api/hotels/${encodeURIComponent(id)}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    const err = await response.json().catch(() => null);
    return {
      success: false,
      error: err?.detail || 'Hotel not found.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

// -------------------------------------------------------------
// FOOD API HELPERS (/api/food)
// -------------------------------------------------------------
export async function getFood(type = null) {
  try {
    const query = type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : '';
    const response = await authFetch(`/api/food${query}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    const err = await response.json().catch(() => null);
    return {
      success: false,
      error: err?.detail || 'Failed to load food spots. Please try again.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

export async function getFoodById(id) {
  try {
    const response = await authFetch(`/api/food/${encodeURIComponent(id)}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    const err = await response.json().catch(() => null);
    return {
      success: false,
      error: err?.detail || 'Food spot not found.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

// -------------------------------------------------------------
// GENERATE ITINERARY PLAN (/api/plan)
// -------------------------------------------------------------
export async function generatePlan(planData) {
  try {
    const response = await authFetch('/api/plan', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    const err = await response.json().catch(() => null);
    return {
      success: false,
      error: err?.detail || 'Failed to generate itinerary. Please try again.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

// -------------------------------------------------------------
// ADMIN DESTINATION MANAGEMENT API HELPERS
// -------------------------------------------------------------
export async function createPlace(formData) {
  try {
    const response = await authFetch('/api/places', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      return { success: true, data };
    }
    return {
      success: false,
      error: data?.detail || 'Failed to create destination. Please check all fields.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

export async function updatePlace(id, formData) {
  try {
    const response = await authFetch(`/api/places/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: formData,
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      return { success: true, data };
    }
    return {
      success: false,
      error: data?.detail || 'Failed to update destination.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

export async function deletePlace(id) {
  try {
    const response = await authFetch(`/api/places/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      return { success: true, data };
    }
    return {
      success: false,
      error: data?.detail || 'Failed to delete destination.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again',
      networkError: true,
    };
  }
}

/**
 * Sends a user query along with conversation history and active trip plan to the Solvane AI Guide.
 */
export async function sendChatMessage({ message, history = [], trip = null }) {
  try {
    const response = await authFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history,
        trip,
      }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      return { success: true, data };
    }
    return {
      success: false,
      error: data?.detail || 'Failed to get an answer from Solvane.',
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Cannot reach server, please try again.',
      networkError: true,
    };
  }
}




