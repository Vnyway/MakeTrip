import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { GuestOnlyRoute, UserRoute, AdminRoute, CatalogRoute } from './guards';
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
import { BookingDetailsPage } from '../pages/user/BookingDetailsPage';
import { ReviewsPage } from '../pages/user/ReviewsPage';
import { ToursPage } from '../pages/user/ToursPage';
import { TourDetailsPage } from '../pages/user/TourDetailsPage';
import { TourCheckoutPage } from '../pages/user/TourCheckoutPage';
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
      <Route element={<AuthLayout />}>
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
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/catalog"
          element={
            <CatalogRoute>
              <CatalogPage />
            </CatalogRoute>
          }
        />
        <Route
          path="/hotels"
          element={
            <CatalogRoute>
              <HotelsPage />
            </CatalogRoute>
          }
        />
        <Route
          path="/restaurants"
          element={
            <CatalogRoute>
              <RestaurantsPage />
            </CatalogRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <CatalogRoute>
              <ActivitiesPage />
            </CatalogRoute>
          }
        />
        <Route
          path="/flights"
          element={
            <CatalogRoute>
              <FlightsPage />
            </CatalogRoute>
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
          path="/bookings/:id"
          element={
            <UserRoute>
              <BookingDetailsPage />
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
          path="/tours/:id/checkout"
          element={
            <UserRoute>
              <TourCheckoutPage />
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
