import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../app/auth';

export function GuestOnlyRoute({ children }) {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return <Navigate to="/catalog" replace />;
  }

  return children;
}

export function UserRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!auth.isAdmin) {
    return <Navigate to="/catalog" replace />;
  }

  return children;
}
