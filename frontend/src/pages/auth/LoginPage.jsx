import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Auth form UI will be implemented in the next step.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
          Back home
        </Link>
      </section>
    </main>
  );
}
