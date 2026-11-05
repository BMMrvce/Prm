import { CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <main className="workbench-scale grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-indigo-600 font-bold">
            W
          </span>
          <span className="text-lg font-semibold">Workbench</span>
        </div>
        <div className="my-auto max-w-lg">
          <p className="text-sm font-medium text-indigo-300">ONE CALM PLACE TO DO YOUR BEST WORK</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            Plans become progress, without the busywork.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Projects, time, conversations, and daily focus—connected in one workbench.
          </p>
          <div className="mt-10 space-y-4">
            {[
              'Office, Studio and Personal workspaces',
              'Tasks, calendar, notes and expenses in one place',
              'Office and Studio mail side by side',
            ].map((item) => (
              <div className="flex items-center gap-3 text-sm text-slate-300" key={item}>
                <CheckCircle2 size={18} className="text-emerald-400" /> {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Designed for teams who value clarity over complexity.
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-indigo-600 font-bold text-white">
              W
            </span>
            <span className="text-lg font-semibold">Workbench</span>
          </div>
          <Suspense>
            <AuthForm />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
