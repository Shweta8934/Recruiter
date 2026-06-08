import Link from 'next/link'
import { ArrowRight, Building2, ShieldCheck, Users, Sparkles, Globe, CheckCircle2, Zap, Briefcase, CircleDollarSign } from 'lucide-react'
import { PLAN_FEATURES, PLAN_NAMES, PLAN_PRICING } from '@/lib/constants'
import type { PlanTier } from '@/types'
import { PricingButton } from '@/components/PricingButton'

const featureCards = [
  { title: 'Strict Tenant Isolation', desc: 'Every org data is scoped and protected with tenant-aware guards.', icon: ShieldCheck },
  { title: 'Unified Multi-Org Login', desc: 'One account can operate multiple organization workspaces.', icon: Users },
  { title: 'White-Labeled Candidate Journey', desc: 'Custom logo, color, and tenant-based candidate experience.', icon: Sparkles },
  { title: 'Tenant URL Routing', desc: 'Organization-specific routes for recruiter and candidate flows.', icon: Globe },
  { title: 'AI Assessments & Screening', desc: 'Automated question papers, scoring, and shortlisting.', icon: Zap },
  { title: 'Role-Secured Collaboration', desc: 'RBAC-ready architecture for HR, interviewer, recruiter roles.', icon: Briefcase },
]

// Single source of truth — driven from lib/constants.ts (same as /subscription page)
const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'professional', 'enterprise']

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></span>
            AI Recruitment Platform
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#solutions" className="hover:text-slate-900">Solutions</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">Log In</Link>
            <Link href="/signup" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Get Started</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">Multi-Tenant AI Hiring Suite</p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Secure, Branded, and Scalable Recruitment for Every Organization</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">Run assessments, interviews, and hiring workflows across multiple tenants without data leakage.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Open Platform <ArrowRight className="ml-2 h-4 w-4" /></Link>
              <Link href="/invites/send" className="inline-flex items-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-100">Start Inviting</Link>
            </div>
          </div>

          <div className="relative rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
            <div className="mb-5 flex items-center justify-between text-xs text-slate-300"><span>Operations Snapshot</span><span className="rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-300">Live Tenant-Safe</span></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Hiring Cycle Reduction</p><p className="mt-1 text-2xl font-bold">38%</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Automation Coverage</p><p className="mt-1 text-2xl font-bold">72%</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Organizations</p><p className="mt-1 text-2xl font-bold">120+</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">API Isolation</p><p className="mt-1 text-2xl font-bold">100%</p></div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">Core Features</h2>
          <p className="mt-2 text-slate-600">Everything needed for enterprise-grade, multi-tenant hiring.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((f) => {
              const Icon = f.icon
              return (
                <article key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="solutions" className="border-y border-slate-200 bg-white/70">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold">Built for Hiring Teams</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {['HR Teams: streamline invites and status tracking', 'Recruiters: manage pipeline and interview loops', 'Interview Panels: see only assigned candidate scope'].map((s, i) => (
                <div key={s} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase text-slate-500">Use Case {i + 1}</p>
                  <p className="mt-3 flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{s}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2"><CircleDollarSign className="h-6 w-6 text-primary" /><h2 className="text-3xl font-bold">Pricing</h2></div>
          <p className="mt-2 text-slate-600">Transparent plans for growing hiring operations.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map((slug) => {
              const features = PLAN_FEATURES[slug]
              const pricing = PLAN_PRICING[slug]
              const isEnterprise = slug === 'enterprise'
              return (
                <div key={slug} className={`rounded-2xl border p-6 ${
                  features.highlight
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-white'
                }`}>
                  {features.highlight && (
                    <span className="mb-3 inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Most Popular</span>
                  )}
                  <p className="text-sm font-semibold text-slate-600">{PLAN_NAMES[slug]}</p>
                  <p className="mt-3 text-3xl font-extrabold">
                    {pricing.displayMonthly}
                    {!isEnterprise && <span className="text-base font-medium text-slate-500">/month</span>}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {features.points.map((pt: string) => (
                      <li key={pt} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />{pt}
                      </li>
                    ))}
                  </ul>
                  <PricingButton 
                    slug={slug} 
                    features={features} 
                    isEnterprise={isEnterprise} 
                  />
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-950 px-6 py-12 text-center text-white">
            <h3 className="text-3xl font-bold">Ready to Modernize Your Hiring Stack?</h3>
            <p className="mt-3 text-slate-300">Launch tenant-safe recruitment workflows with AI automation and branded candidate experience.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Start Free Setup</Link>
              <Link href="/login" className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-900">Book Demo</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AI Recruitment Platform</p>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-slate-700">Features</a>
            <a href="#pricing" className="hover:text-slate-700">Pricing</a>
            <Link href="/login" className="hover:text-slate-700">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
