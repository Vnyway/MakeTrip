import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/navigation/Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
