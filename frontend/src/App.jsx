import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Budget from './pages/Budget';
import Time from './pages/Time';
import Destinations from './pages/Destinations';
import PlaceDetail from './pages/PlaceDetail';
import Plan from './pages/Plan';
import Chat from './pages/Chat';
import MapPage from './pages/MapPage';
import Explore from './pages/Explore';
import ExploreCategory from './pages/ExploreCategory';
import ExploreHotels from './pages/ExploreHotels';
import ExploreFood from './pages/ExploreFood';
import MyTrips from './pages/MyTrips';
import About from './pages/About';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPlacesList from './pages/admin/AdminPlacesList';
import PlaceForm from './pages/admin/PlaceForm';
import AdminHotelsList from './pages/admin/AdminHotelsList';
import HotelForm from './pages/admin/HotelForm';
import AdminFoodList from './pages/admin/AdminFoodList';
import FoodForm from './pages/admin/FoodForm';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { TripProvider } from './context/TripContext';

/**
 * Solvane - App Routing
 * 
 * Routes:
 * - "/": Welcome Page
 * - "/login": Login Page
 * - "/signup": Signup Page
 * - "/budget": Real Budget Page
 * - "/time": Time/Duration Page
 * - "/destinations": Famous Destinations Page
 * - "/place/:id": Place Detail Page
 * - "/plan": Itinerary Plan Page
 * - "/explore": Explore Hub
 * - "/admin/places": Admin Destinations Management Table
 * - "/admin/places/new": Add New Destination Form
 * - "/admin/places/:id/edit": Edit Destination Form
 */
export default function App() {
  return (
    <TripProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Welcome Page */}
          <Route path="/" element={<Welcome />} />

          {/* Public-only routes: redirects to /budget if already logged in */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <Signup />
              </PublicOnlyRoute>
            }
          />

          {/* Protected routes: requires valid authentication token */}
          <Route
            path="/budget"
            element={
              <ProtectedRoute>
                <Budget />
              </ProtectedRoute>
            }
          />
          <Route
            path="/time"
            element={
              <ProtectedRoute>
                <Time />
              </ProtectedRoute>
            }
          />
          <Route
            path="/destinations"
            element={
              <ProtectedRoute>
                <Destinations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/place/:id"
            element={
              <ProtectedRoute>
                <PlaceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan"
            element={
              <ProtectedRoute>
                <Plan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-trips"
            element={
              <ProtectedRoute>
                <MyTrips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />

          {/* Explore Hub & Category Directory Routes */}
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <Explore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore/hotels"
            element={
              <ProtectedRoute>
                <ExploreHotels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore/hotel"
            element={
              <ProtectedRoute>
                <ExploreHotels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore/food"
            element={
              <ProtectedRoute>
                <ExploreFood />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore/:category"
            element={
              <ProtectedRoute>
                <ExploreCategory />
              </ProtectedRoute>
            }
          />

          {/* Administrator Protected Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/places"
            element={
              <AdminRoute>
                <AdminPlacesList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/places/new"
            element={
              <AdminRoute>
                <PlaceForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/places/:id/edit"
            element={
              <AdminRoute>
                <PlaceForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/hotels"
            element={
              <AdminRoute>
                <AdminHotelsList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/hotels/new"
            element={
              <AdminRoute>
                <HotelForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/hotels/:id/edit"
            element={
              <AdminRoute>
                <HotelForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/food"
            element={
              <AdminRoute>
                <AdminFoodList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/food/new"
            element={
              <AdminRoute>
                <FoodForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/food/:id/edit"
            element={
              <AdminRoute>
                <FoodForm />
              </AdminRoute>
            }
          />

          {/* About Page */}
          <Route path="/about" element={<About />} />

          {/* Friendly 404 Catch-All Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TripProvider>
  );
}
