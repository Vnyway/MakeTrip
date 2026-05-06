import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../app/auth';

const publicItems = [{ to: '/', label: 'Home' }];

const userItems = [
  { to: '/catalog', label: 'Catalog' },
  { to: '/hotels', label: 'Hotels' },
  { to: '/restaurants', label: 'Restaurants' },
  { to: '/activities', label: 'Activities' },
  { to: '/flights', label: 'Flights' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/tours', label: 'Tours' },
];

const accountItems = [
  { to: '/favorites', label: 'Favorites' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/profile', label: 'Profile' },
];

const adminItems = [
  { to: '/admin', label: 'Admin' },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/media', label: 'Media' },
];

function ItemLink({ to, label, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-brand text-white' : 'text-brand hover:bg-mint-200'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export function Navbar() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  const desktopItems = [
    ...publicItems,
    ...(auth.isAuthenticated ? userItems : []),
    ...(auth.isAuthenticated ? accountItems : []),
    ...(auth.isAdmin ? adminItems : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-mint-200 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-lg border border-mint-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand">
          MakeTrip
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {desktopItems.map((item) => (
            <ItemLink key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {!auth.isAuthenticated ? (
            <>
              <Link className="btn-soft" to="/login">
                Log in
              </Link>
              <Link className="btn-primary" to="/register">
                Sign up
              </Link>
            </>
          ) : (
            <button className="btn-soft" onClick={auth.logout} type="button">
              Log out
            </button>
          )}
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-mint-200 bg-white text-brand lg:hidden"
          onClick={() => setOpen((prev) => !prev)}
          type="button"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-mint-200 bg-surface lg:hidden">
          <nav className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {desktopItems.map((item) => (
              <ItemLink
                key={item.to}
                to={item.to}
                label={item.label}
                onNavigate={() => setOpen(false)}
              />
            ))}

            {!auth.isAuthenticated ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link className="btn-soft text-center" onClick={() => setOpen(false)} to="/login">
                  Log in
                </Link>
                <Link className="btn-primary text-center" onClick={() => setOpen(false)} to="/register">
                  Sign up
                </Link>
              </div>
            ) : (
              <button
                className="btn-soft mt-2"
                onClick={() => {
                  auth.logout();
                  setOpen(false);
                }}
                type="button"
              >
                Log out
              </button>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
