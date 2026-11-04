import { ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <main className="workbench-scale grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-indigo-600 font-bold">
            W
          </span>
          <span className="text-lg font-semibold">Workbench</span>
        </Link>
        <div className="my-auto max-w-lg">
          <p className="text-sm font-medium text-indigo-300">ONE CALM PLACE TO DO YOUR BEST WORK</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            Plans become progress, without the busywork.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Projects, time, conversations, and daily focus—connected in a workbench your team will
            actually enjoy using.
          </p>
          <div className="mt-10 space-y-4">
            {[
              'A focused daily command center',
              'Flexible project and task workflows',
              'Secure workspace-based collaboration',
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
          <Link href="/" className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-indigo-600 font-bold text-white">
              W
            </span>
            <span className="text-lg font-semibold">Workbench</span>
          </Link>
          <p className="text-sm font-medium text-indigo-600">Welcome back</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Sign in to your workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your work email or continue with Google.
          </p>
          <div className="mt-8 space-y-3">
            <button className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <KeyRound size={17} /> Continue with Google
            </button>
            <div className="flex items-center gap-3 py-2">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Email address</span>
              <span className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                <Mail size={16} className="text-slate-400" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </span>
            </label>
            <label className="block">
              <span className="flex justify-between text-xs font-medium text-slate-700">
                <span>Password</span>
                <button className="font-medium text-indigo-600">Forgot password?</button>
              </span>
              <input
                type="password"
                placeholder="Enter your password"
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <Link
              href="/office"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Sign in <ArrowRight size={16} />
            </Link>
            <button className="flex h-10 w-full items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Email me a magic link
            </button>
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            New to Workbench?{' '}
            <button className="font-medium text-indigo-600">Create an account</button>
          </p>
          <p className="mt-10 text-center text-[11px] leading-5 text-slate-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  )
}
