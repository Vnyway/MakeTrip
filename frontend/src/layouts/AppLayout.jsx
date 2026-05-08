import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/Footer';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-mint-100 text-brand">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
