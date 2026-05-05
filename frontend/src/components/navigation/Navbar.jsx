import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/admin', label: 'Admin' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold">
          MakeTrip
        </Link>

        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700" to="/login">
            Log in
          </Link>
          <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white" to="/register">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
