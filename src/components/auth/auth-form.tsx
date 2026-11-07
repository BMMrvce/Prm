'use client'

import { ArrowRight, Lock, Mail, User } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'

/** Email/password sign-in and account creation against Supabase Auth. */
export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only follow same-site relative paths after login.
  const nextParam = searchParams.get('next')
  const next = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/office'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        const result = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) throw new Error(result.error || 'Could not create the account.')
      }
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        throw new Error(
          /invalid login/i.test(signInError.message)
            ? 'Wrong email or password.'
            : signInError.message,
        )
      }
      router.replace(next)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  const switchMode = (value: Mode) => {
    setMode(value)
    setError(null)
  }

  const field =
    'flex h-11 items-center gap-2 rounded-lg border border-line-strong px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
  const input = 'min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ink-3'

  return (
    <div className="w-full max-w-md">
      <p className="text-sm font-medium text-primary-ink">
        {mode === 'signin' ? 'Welcome back' : 'Get started'}
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {mode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}
      </h2>
      <div className="mt-6 grid grid-cols-2 rounded-lg bg-surface-2 p-1 text-sm font-medium">
        {(['signin', 'signup'] as const).map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => switchMode(value)}
            className={`h-9 rounded-md transition ${mode === value ? 'bg-segment text-ink shadow-sm' : 'text-ink-2'}`}
          >
            {value === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <label className="block">
            <span className="text-xs font-medium text-ink-2">Full name</span>
            <span className={`mt-2 ${field}`}>
              <User size={16} className="text-ink-3" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Your name"
                className={input}
                required
              />
            </span>
          </label>
        )}
        <label className="block">
          <span className="text-xs font-medium text-ink-2">Email address</span>
          <span className={`mt-2 ${field}`}>
            <Mail size={16} className="text-ink-3" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              className={input}
              required
            />
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-2">Password</span>
          <span className={`mt-2 ${field}`}>
            <Lock size={16} className="text-ink-3" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signin' ? 'Enter your password' : 'At least 8 characters'}
              minLength={mode === 'signup' ? 8 : undefined}
              className={input}
              required
            />
          </span>
        </label>
        {error && (
          <p className="rounded-lg bg-error-light px-3 py-2 text-sm text-error-ink" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-on-primary shadow-sm hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          {!busy && <ArrowRight size={16} />}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-2">
        {mode === 'signin' ? 'New to ಆyaama? ' : 'Already have an account? '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
          className="font-medium text-primary-ink"
        >
          {mode === 'signin' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}
