import { Link } from 'react-router-dom';
import { IoAirplaneOutline } from 'react-icons/io5';
import { useAuth } from '../../app/auth';

const browseLinks = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/hotels', label: 'Hotels' },
  { to: '/restaurants', label: 'Restaurants' },
  { to: '/activities', label: 'Activities' },
  { to: '/flights', label: 'Flights' },
  { to: '/tours', label: 'Tours' },
];

const accountLinks = [
  { to: '/favorites', label: 'Favorites' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/profile', label: 'Profile' },
];

const adminLinks = [
  { to: '/admin', label: 'Admin' },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/media', label: 'Media' },
];

function LinkColumn({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-brand">{title}</h3>
      <ul className="space-y-2 text-sm text-accent">{children}</ul>
    </div>
  );
}

export function Footer() {
  const auth = useAuth();

  return (
    <footer className="mt-auto border-t border-mint-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className={`grid gap-10 sm:grid-cols-2 ${auth.isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand">
              <IoAirplaneOutline className="text-2xl text-accent" aria-hidden />
              <span className="text-lg font-bold tracking-tight">MakeTrip</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-accent">
              Your trusted partner for unforgettable travel experiences.
            </p>
          </div>

          <LinkColumn title="Browse">
            {browseLinks.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition hover:text-brand">
                  {item.label}
                </Link>
              </li>
            ))}
          </LinkColumn>

          <LinkColumn title="My account">
            {accountLinks.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition hover:text-brand">
                  {item.label}
                </Link>
              </li>
            ))}
          </LinkColumn>

          {auth.isAdmin ? (
            <LinkColumn title="Admin">
              {adminLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="transition hover:text-brand">
                    {item.label}
                  </Link>
                </li>
              ))}
            </LinkColumn>
          ) : null}
        </div>

        <div className="mt-10 border-t border-mint-200 pt-6 text-center text-xs text-accent">
          © {new Date().getFullYear()} MakeTrip. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
