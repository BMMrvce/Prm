import { CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { Logo } from '@/components/brand/logo'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <main className="workbench-scale grid min-h-screen bg-surface lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-primary-deep p-12 text-on-primary lg:flex lg:flex-col">
        <Logo onDark className="h-9" />
        <div className="my-auto max-w-lg">
          <p className="text-sm font-medium tracking-[0.08em] text-accent">
            CLARITY · FOCUS · STRUCTURE · PROGRESS
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08]">
            Plans become progress, without the busywork.
          </h1>
          <p className="mt-6 text-lg leading-8 text-on-primary-muted">
            Projects, time, conversations and daily focus, connected in one calm place.
          </p>
          <div className="mt-10 space-y-4">
            {[
              'Office, Studio and Personal workspaces',
              'Tasks, calendar, notes and money in one place',
              'Your own mailbox in every workspace',
            ].map((item) => (
              <div className="flex items-center gap-3 text-sm text-on-primary-muted" key={item}>
                <CheckCircle2 size={18} className="text-accent" /> {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-on-primary-muted">
          Designed for teams who value clarity over complexity.
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12 lg:hidden">
            <Logo className="h-8" />
          </div>
          <Suspense>
            <AuthForm />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
