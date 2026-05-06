import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import toast from 'react-hot-toast';
import { ZodError } from 'zod';
import { useAuth } from '../../app/auth';
import { loginRequest } from '../../features/auth/auth.api';
import { loginSchema } from '../../features/auth/auth.schemas';
import { getErrorMessage } from '../../lib/errors';

function mapZodIssues(issues) {
  return issues.reduce((acc, issue) => {
    const key = issue.path[0];
    if (typeof key === 'string' && !acc[key]) {
      acc[key] = issue.message;
    }
    return acc;
  }, {});
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const redirectTo = location.state?.from?.pathname || '/catalog';

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      auth.loginWithToken(data.token, data.user);
      toast.success('Welcome back!');
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not sign in.'));
    },
  });

  function handleChange(event) {
    const { name, type, checked, value } = event.target;

    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({});

    try {
      const parsed = loginSchema.parse(values);
      mutation.mutate({ email: parsed.email, password: parsed.password });
    } catch (error) {
      if (error instanceof ZodError) {
        setFieldErrors(mapZodIssues(error.issues));
      } else {
        toast.error('Validation failed.');
      }
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-mint-200 bg-white p-6 shadow-card sm:p-7"
    >
      <div className="mb-6 text-center">
        <div className="mb-2 inline-flex items-center gap-2 text-brand">
          <Plane size={18} />
          <span className="text-lg font-semibold">MakeTrip</span>
        </div>
        <p className="text-sm text-accent">Sign in to your account</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            className="w-full rounded-md border border-mint-200 bg-mint-100 px-3 py-2 text-sm text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            placeholder="you@example.com"
            autoComplete="email"
          />
          {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-brand" htmlFor="password">
              Password
            </label>
            <button type="button" className="text-xs text-accent hover:underline">
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            className="w-full rounded-md border border-mint-200 bg-mint-100 px-3 py-2 text-sm text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-brand">
          <input
            type="checkbox"
            name="rememberMe"
            checked={values.rememberMe}
            onChange={handleChange}
            className="h-4 w-4 rounded border-mint-200 text-accent focus:ring-accent"
          />
          Remember me
        </label>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-accent">
          Don't have an account?{' '}
          <Link className="font-semibold text-brand hover:underline" to="/register">
            Sign up
          </Link>
        </p>
      </form>

      <div className="mt-5 rounded-lg border border-mint-200 bg-mint-100 p-3 text-xs text-accent">
        <p className="font-semibold text-brand">Demo credentials</p>
        <p>User: user@mailtrip.com</p>
        <p>Admin: admin@mailtrip.com</p>
        <p>Password: any</p>
      </div>
    </motion.section>
  );
}
