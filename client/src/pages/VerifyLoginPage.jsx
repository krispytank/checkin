import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Loader2, ArrowLeft, ShieldCheck, Mail } from 'lucide-react';

const codeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

export default function VerifyLoginPage() {
  const [, navigate] = useLocation();
  const { verifyToken, sendLoginCode, verifyLoginCode, isSendCodePending, isVerifyCodePending, verifyError } = useAuth();
  const [codeSent, setCodeSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(codeSchema),
  });

  // Auto-send code on mount
  useEffect(() => {
    if (verifyToken && !codeSent) {
      sendLoginCode(verifyToken)
        .then(() => setCodeSent(true))
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to send verification code');
        });
    }
  }, [verifyToken, codeSent, sendLoginCode]);

  // Redirect if no verify token
  useEffect(() => {
    if (!verifyToken) {
      navigate('/login');
    }
  }, [verifyToken, navigate]);

  const onResend = async () => {
    try {
      setError('');
      await sendLoginCode(verifyToken);
      setCodeSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    }
  };

  const onSubmit = async (data) => {
    try {
      setError('');
      await verifyLoginCode(verifyToken, data.code);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Verification Complete</h1>
            <p className="mt-2 text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/jud-logo.png" alt="Mahakama" className="mx-auto h-16 w-16 rounded-2xl object-contain" />
          <h1 className="mt-6 text-2xl font-bold">Verify Your Identity</h1>
          <p className="mt-2 text-muted-foreground">
            After your password reset, we need to verify it's you.
            A 6-digit code has been sent to your email.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {(error || verifyError) && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error || verifyError?.response?.data?.message || 'Verification failed'}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-1">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                {...register('code')}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="000000"
                autoFocus
              />
              {errors.code && (
                <p className="mt-1 text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyCodePending}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isVerifyCodePending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              onClick={onResend}
              disabled={isSendCodePending}
              className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {isSendCodePending ? 'Sending...' : 'Resend code'}
            </button>
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
