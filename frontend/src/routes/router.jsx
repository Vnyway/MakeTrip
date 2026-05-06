import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { GuestOnlyRoute, UserRoute, AdminRoute } from './guards';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { CatalogPage } from '../pages/catalog/CatalogPage';
import { HotelsPage } from '../pages/catalog/HotelsPage';
import { RestaurantsPage } from '../pages/catalog/RestaurantsPage';
import { ActivitiesPage } from '../pages/catalog/ActivitiesPage';
import { FlightsPage } from '../pages/catalog/FlightsPage';
import { ServiceDetailsPage } from '../pages/services/ServiceDetailsPage';
import { FavoritesPage } from '../pages/user/FavoritesPage';
import { BookingsPage } from '../pages/user/BookingsPage';
import { ReviewsPage } from '../pages/user/ReviewsPage';
import { RecommendationsPage } from '../pages/user/RecommendationsPage';
import { ToursPage } from '../pages/user/ToursPage';
import { TourDetailsPage } from '../pages/user/TourDetailsPage';
import { ProfilePage } from '../pages/user/ProfilePage';
import { AdminPage } from '../pages/admin/AdminPage';
import { AdminServicesPage } from '../pages/admin/AdminServicesPage';
import { AdminBookingsPage } from '../pages/admin/AdminBookingsPage';
import { AdminReviewsPage } from '../pages/admin/AdminReviewsPage';
import { AdminMediaPage } from '../pages/admin/AdminMediaPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute>
              <RegisterPage />
            </GuestOnlyRoute>
          }
        />

        <Route
          path="/catalog"
          element={
            <UserRoute>
              <CatalogPage />
            </UserRoute>
          }
        />
        <Route
          path="/hotels"
          element={
            <UserRoute>
              <HotelsPage />
            </UserRoute>
          }
        />
        <Route
          path="/restaurants"
          element={
            <UserRoute>
              <RestaurantsPage />
            </UserRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <UserRoute>
              <ActivitiesPage />
            </UserRoute>
          }
        />
        <Route
          path="/flights"
          element={
            <UserRoute>
              <FlightsPage />
            </UserRoute>
          }
        />
        <Route
          path="/services/:id"
          element={
            <UserRoute>
              <ServiceDetailsPage />
            </UserRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <UserRoute>
              <FavoritesPage />
            </UserRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <UserRoute>
              <BookingsPage />
            </UserRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <UserRoute>
              <ReviewsPage />
            </UserRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <UserRoute>
              <RecommendationsPage />
            </UserRoute>
          }
        />
        <Route
          path="/tours"
          element={
            <UserRoute>
              <ToursPage />
            </UserRoute>
          }
        />
        <Route
          path="/tours/:id"
          element={
            <UserRoute>
              <TourDetailsPage />
            </UserRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <UserRoute>
              <ProfilePage />
            </UserRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <AdminRoute>
              <AdminServicesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <AdminBookingsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminRoute>
              <AdminReviewsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/media"
          element={
            <AdminRoute>
              <AdminMediaPage />
            </AdminRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
