import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';
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
        `whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const desktopItems = [
    ...publicItems,
    ...(auth.isAuthenticated ? userItems : []),
    ...(auth.isAuthenticated ? accountItems : []),
    ...(auth.isAdmin ? adminItems : []),
  ];

  function handleLogout() {
    auth.logout();
    toast.success('Signed out successfully.');
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-mint-200 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="shrink-0 rounded-lg border border-mint-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand"
        >
          MakeTrip
        </Link>

        <div className="mx-3 hidden min-w-0 flex-1 2xl:block">
          <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap py-1">
            {desktopItems.map((item) => (
              <ItemLink key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
        </div>

        <div className="hidden shrink-0 items-center gap-2 2xl:flex">
          {!auth.isAuthenticated ? (
            <>
              <Link className="btn-soft whitespace-nowrap" to="/login">
                Log in
              </Link>
              <Link className="btn-primary whitespace-nowrap" to="/register">
                Sign up
              </Link>
            </>
          ) : (
            <button className="btn-soft whitespace-nowrap" onClick={handleLogout} type="button">
              Log out
            </button>
          )}
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-mint-200 bg-white text-brand 2xl:hidden"
          onClick={() => setOpen((prev) => !prev)}
          type="button"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-mint-200 bg-surface 2xl:hidden">
          <nav className="mx-auto flex w-full max-w-[1800px] flex-col gap-1 px-4 py-3 sm:px-6">
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
                  handleLogout();
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
