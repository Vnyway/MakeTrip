import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import {
  MdHome,
  MdHotel,
  MdRestaurantMenu,
  MdHiking,
  MdFlightTakeoff,
  MdCalendarMonth,
  MdFavorite,
  MdReceiptLong,
  MdRateReview,
  MdPerson,
  MdLogin,
  MdLogout,
  MdDashboard,
  MdAddBusiness,
  MdAssignment,
  MdComment,
  MdPermMedia,
} from 'react-icons/md';
import { IoAirplaneOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useAuth } from '../../app/auth';

/** Browse & trips (no separate /catalog — home is the catalog). */
const catalogNavItems = [
  { to: '/', label: 'Home', Icon: MdHome },
  { to: '/hotels', label: 'Hotels', Icon: MdHotel },
  { to: '/restaurants', label: 'Restaurants', Icon: MdRestaurantMenu },
  { to: '/activities', label: 'Activities', Icon: MdHiking },
  { to: '/flights', label: 'Flights', Icon: MdFlightTakeoff },
  { to: '/tours', label: 'Tours', Icon: MdCalendarMonth },
];

const accountNavItems = [
  { to: '/favorites', label: 'Favorites', Icon: MdFavorite },
  { to: '/bookings', label: 'Bookings', Icon: MdReceiptLong },
  { to: '/reviews', label: 'Reviews', Icon: MdRateReview },
  { to: '/profile', label: 'Profile', Icon: MdPerson },
];

const adminNavItems = [
  { to: '/admin', label: 'Admin', Icon: MdDashboard },
  { to: '/admin/services', label: 'Services', Icon: MdAddBusiness },
  { to: '/admin/bookings', label: 'Bookings', Icon: MdAssignment },
  { to: '/admin/reviews', label: 'Reviews', Icon: MdComment },
  { to: '/admin/media', label: 'Media', Icon: MdPermMedia },
];

function NavItemLink({ to, label, Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition sm:gap-2 sm:px-3 sm:text-sm ${
          isActive ? 'bg-brand text-white shadow-sm' : 'text-brand hover:bg-mint-200'
        }`
      }
    >
      <Icon className="text-lg shrink-0 sm:text-xl" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </NavLink>
  );
}

export function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const showMainNav = auth.isAuthenticated && !auth.isBootstrapping;
  /** Admin has many more links; keep burger until ~full HD so tabs are not clipped. */
  const desktopNavBp = auth.isAdmin ? 'min-[1920px]' : '2xl';

  const desktopNavItems = [
    ...catalogNavItems,
    ...accountNavItems,
    ...(auth.isAdmin ? adminNavItems : []),
  ];

  function handleLogout() {
    auth.logout();
    toast.success('Signed out successfully.');
    navigate('/login');
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-mint-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" onClick={() => setOpen(false)}>
          <IoAirplaneOutline className="shrink-0 text-2xl text-accent sm:text-3xl" aria-hidden />
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight text-brand">MakeTrip</div>
            <p className="text-xs text-accent">Plan your perfect journey</p>
          </div>
        </Link>

        {showMainNav ? (
          <nav
            className={`mx-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1 ${desktopNavBp}:flex ${desktopNavBp}:justify-center`}
          >
            {desktopNavItems.map((item) => (
              <NavItemLink key={item.to} to={item.to} label={item.label} Icon={item.Icon} />
            ))}
          </nav>
        ) : (
          <div className={`hidden flex-1 ${desktopNavBp}:block`} aria-hidden />
        )}

        <div className="flex shrink-0 items-center gap-2">
          {!auth.isAuthenticated && !auth.isBootstrapping ? (
            <>
              <Link
                to="/login"
                className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <MdLogin className="text-lg" aria-hidden />
                Sign In
              </Link>
              <Link to="/register" className="btn-soft hidden rounded-lg px-3 py-2 text-sm sm:inline-flex">
                Sign up
              </Link>
            </>
          ) : auth.isAuthenticated ? (
            <>
              <button
                type="button"
                className={`btn-soft hidden items-center gap-2 rounded-lg px-3 py-2 text-sm ${desktopNavBp}:inline-flex`}
                onClick={handleLogout}
              >
                <MdLogout className="text-lg" aria-hidden />
                Log out
              </button>
              {showMainNav ? (
                <button
                  type="button"
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-mint-200 bg-white text-brand ${desktopNavBp}:hidden`}
                  onClick={() => setOpen((prev) => !prev)}
                  aria-expanded={open}
                  aria-label={open ? 'Close menu' : 'Open menu'}
                >
                  {open ? <X size={20} /> : <Menu size={20} />}
                </button>
              ) : null}
            </>
          ) : (
            <div className="h-10 w-24 animate-pulse rounded-lg bg-mint-200" aria-hidden />
          )}
        </div>
      </div>

      {open && showMainNav ? (
        <div className={`border-t border-mint-200 bg-white ${desktopNavBp}:hidden`}>
          <nav className="mx-auto flex max-h-[min(70vh,32rem)] max-w-[1800px] flex-col gap-1 overflow-y-auto px-4 py-3 sm:px-6">
            {desktopNavItems.map((item) => (
              <NavItemLink
                key={item.to}
                to={item.to}
                label={item.label}
                Icon={item.Icon}
                onNavigate={() => setOpen(false)}
              />
            ))}
            <button
              type="button"
              className="btn-soft mt-2 inline-flex items-center justify-center gap-2"
              onClick={handleLogout}
            >
              <MdLogout className="text-lg" aria-hidden />
              Log out
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
