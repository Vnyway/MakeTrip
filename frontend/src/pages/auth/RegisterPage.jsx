import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import toast from 'react-hot-toast';
import { ZodError } from 'zod';
import { useAuth } from '../../app/auth';
import { registerRequest } from '../../features/auth/auth.api';
import { registerSchema } from '../../features/auth/auth.schemas';
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

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      auth.loginWithToken(data.token, data.user);
      toast.success('Account created successfully.');
      navigate('/catalog', { replace: true });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not create account.'));
    },
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({});

    try {
      const parsed = registerSchema.parse(values);
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
        <p className="text-sm text-accent">Create your account</p>
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
          <label className="mb-1 block text-sm font-medium text-brand" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            className="w-full rounded-md border border-mint-200 bg-mint-100 px-3 py-2 text-sm text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brand" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={handleChange}
            className="w-full rounded-md border border-mint-200 bg-mint-100 px-3 py-2 text-sm text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            placeholder="Repeat your password"
            autoComplete="new-password"
          />
          {fieldErrors.confirmPassword ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mutation.isPending ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-center text-sm text-accent">
          Already have an account?{' '}
          <Link className="font-semibold text-brand hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </motion.section>
  );
}
