import { useState } from 'react';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const resetSchema = z.object({
  token: z.string().min(1, 'Reset code is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: email, 2: reset
  const [resetToken, setResetToken] = useState('');
  const { forgotPassword, resetPassword, isForgotPasswordPending, isResetPasswordPending } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
  });

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
  });

  const onEmailSubmit = async (data) => {
    try {
      setError('');
      await forgotPassword(data.email);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    }
  };

  const onResetSubmit = async (data) => {
    try {
      setError('');
      await resetPassword(data.token, data.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Password Reset Successful</h1>
            <p className="mt-2 text-muted-foreground">
              Your password has been reset successfully.
            </p>
          </div>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in with new password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and title */}
        <div className="text-center">
          <img src="/jud-logo.png" alt="Mahakama" className="mx-auto h-16 w-16 rounded-2xl object-contain" />
          <h1 className="mt-6 text-2xl font-bold">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {step === 1
              ? "Enter your email and we'll send you a reset code"
              : 'Enter the reset code and your new password'}
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...emailForm.register('email')}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@example.com"
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isForgotPasswordPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isForgotPasswordPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium mb-1">
                  Reset Code
                </label>
                <input
                  id="token"
                  type="text"
                  {...resetForm.register('token')}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter reset code"
                />
                {resetForm.formState.errors.token && (
                  <p className="mt-1 text-sm text-destructive">
                    {resetForm.formState.errors.token.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  {...resetForm.register('newPassword')}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
                {resetForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-destructive">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...resetForm.register('confirmPassword')}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
                {resetForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-destructive">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {resetPassword.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <div className="mt-4">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
