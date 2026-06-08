import { prisma } from '@/lib/server/prisma'
import { CandidateRegistrationForm } from '@/components/question-papers/CandidateRegistrationForm'
import { Hexagon, MailIcon, ShieldAlert, Clock4 } from 'lucide-react'
import { ThemeProviderClient } from '@/components/theme-provider-client'

export default async function TakeTestPage(props: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ email?: string }>
}) {
  const { id } = await props.params;
  const { email } = await props.searchParams;

  const paper = await prisma.questionPaper.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      jobTitle: true,
      duration: true,
      totalQuestions: true,
      isActive: true,
      isPublicActive: true,
      organization: {
        select: {
          name: true,
          logo: true,
          email: true,
          primaryColor: true,
        }
      },
      job: {
        select: {
          status: true,
          title: true,
        }
      }
    }
  });

  // Helper: shared header with org branding
  const OrgHeader = () => (
    <header className="bg-background border-b h-16 flex items-center px-6 shrink-0">
      <div className="flex items-center gap-3 font-bold text-lg">
        {paper?.organization?.logo ? (
          <img src={paper.organization.logo} alt={paper.organization.name} className="h-8 w-auto rounded" />
        ) : (
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <Hexagon className="w-5 h-5 fill-current" />
          </div>
        )}
        <span className="text-slate-800">{paper?.organization?.name}</span>
      </div>
    </header>
  );

  // 1. Paper not found or deleted
  if (!paper || !paper.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="bg-card border rounded-xl p-10 max-w-md w-full text-center shadow-sm space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Assessment Not Found</h1>
          <p className="text-muted-foreground">This assessment does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // 2. Job is linked but NOT open (closed / paused / filled / etc.)
  if (paper.job && paper.job.status !== 'open') {
    const statusConfig: Record<string, { label: string; icon: string; msg: string; bg: string; iconBg: string; iconColor: string }> = {
      closed:  { label: 'Position Closed',   icon: '🔴', msg: 'This position has been closed and is no longer accepting applications.',       bg: 'bg-red-50',    iconBg: 'bg-red-100',    iconColor: 'text-red-600' },
      paused:  { label: 'Hiring Paused',     icon: '🟡', msg: 'Hiring for this position is temporarily paused. Check back later.',              bg: 'bg-amber-50',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600' },
      filled:  { label: 'Position Filled',   icon: '🔵', msg: 'This position has already been filled. Thank you for your interest.',            bg: 'bg-blue-50',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600' },
      draft:   { label: 'Not Yet Open',      icon: '⚪', msg: 'This job posting is not yet open for applications.',                             bg: 'bg-slate-50',  iconBg: 'bg-slate-100',  iconColor: 'text-slate-600' },
    };
    const cfg = statusConfig[paper.job.status] ?? {
      label: 'Link Not Active', icon: '⛔', msg: 'This application link is currently not active.', bg: 'bg-muted', iconBg: 'bg-muted', iconColor: 'text-muted-foreground'
    };

    return (
      <ThemeProviderClient hexColor={paper.organization?.primaryColor}>
        <div className="min-h-screen flex flex-col bg-muted/10 relative">
          <OrgHeader />

        {/* Blurred dimmed page background hint */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 pointer-events-none select-none" aria-hidden="true">
          {/* Ghost registration form silhouette */}
          <div className="bg-card border rounded-xl shadow-lg overflow-hidden max-w-4xl w-full mx-auto grid md:grid-cols-5 opacity-20 blur-sm">
            <div className="bg-primary p-8 text-primary-foreground md:col-span-2 h-64" />
            <div className="p-8 md:col-span-3 h-64" />
          </div>
        </div>

        {/* Modal overlay */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
            {/* Coloured top strip */}
            <div className={`${cfg.bg} px-8 pt-8 pb-6 text-center border-b`}>
              <div className={`mx-auto w-16 h-16 rounded-full ${cfg.iconBg} flex items-center justify-center text-3xl mb-4`}>
                {cfg.icon}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{cfg.label}</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">{paper.job.title}</p>
            </div>

            {/* Body */}
            <div className="px-8 py-6 text-center space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{cfg.msg}</p>

              {paper.organization?.email && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Need help?</p>
                  <a
                    href={`mailto:${paper.organization.email}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                  >
                    <MailIcon className="w-4 h-4" />
                    Contact Administration
                  </a>
                  <p className="text-xs text-gray-400">{paper.organization.email}</p>
                </div>
              )}

              {!paper.organization?.email && (
                <p className="text-xs text-gray-400 pt-2 border-t">Please reach out to your recruiter directly for more information.</p>
              )}
            </div>

            {/* Footer with org name */}
            {paper.organization?.name && (
              <div className="px-8 pb-5 text-center">
                <p className="text-xs text-gray-300">— {paper.organization.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ThemeProviderClient>
  );
}

  // 3. Public link disabled (no invite email)
  if (!paper.isPublicActive && !email) {
    return (
      <ThemeProviderClient hexColor={paper.organization?.primaryColor}>
        <div className="min-h-screen flex flex-col bg-muted/10">
          <OrgHeader />
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="bg-card border rounded-xl shadow-md max-w-md w-full p-10 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Assessment Closed</h1>
              <p className="text-muted-foreground text-sm">
                This assessment is currently not accepting new public responses. If you received an invitation, please use the link from your email.
              </p>
            </div>
            {paper.organization?.email && (
              <div className="border-t pt-5">
                <a
                  href={`mailto:${paper.organization.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <MailIcon className="w-4 h-4" />
                  Contact Administration
                </a>
              </div>
            )}
          </div>
        </main>
      </div>
    </ThemeProviderClient>
  );
}

  // 4. All checks passed — show registration form
  return (
    <ThemeProviderClient hexColor={paper.organization?.primaryColor}>
      <div className="min-h-screen flex flex-col bg-muted/10">
        <OrgHeader />
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <CandidateRegistrationForm 
          paperId={paper.id} 
          paper={paper} 
          initialEmail={email}
        />
      </main>
      </div>
    </ThemeProviderClient>
  )
}

