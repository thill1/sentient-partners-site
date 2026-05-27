import React, { useState } from 'react';
import { Button } from './Button';
import { Logo } from './Logo';

interface AdminLoginProps {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (username: string, password: string) => Promise<void>;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  error,
  isSubmitting,
  onSubmit,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(username.trim(), password);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl dark:border-white/10 dark:bg-slate-900/80">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold">Admin Login</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Sign in to update the site banner and AI settings.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="admin-username">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
