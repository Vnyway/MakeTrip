import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../app/auth';
import { RouteLoader } from '../components/ui/RouteLoader';

export function GuestOnlyRoute({ children }) {
  const auth = useAuth();

  if (auth.isBootstrapping) {
    return <RouteLoader />;
  }

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function UserRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isBootstrapping) {
    return <RouteLoader />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function CatalogRoute({ children }) {
  const auth = useAuth();

  if (auth.isBootstrapping) {
    return <RouteLoader />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isBootstrapping) {
    return <RouteLoader />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!auth.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
