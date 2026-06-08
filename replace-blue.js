const fs = require('fs');

const files = [
  'app/billing/dashboard/page.tsx',
  'app/candidates/[id]/page.tsx',
  'app/job-posts/page.tsx',
  'app/question-papers/page.tsx',
  'app/question-papers/[id]/page.tsx',
  'app/question-papers/[id]/attempts/[attemptId]/page.tsx',
  'app/recruiter/dashboard/page.tsx',
  'app/rounds/page.tsx',
  'app/skills/page.tsx',
  'components/question-papers/TestEnvironment.tsx',
  'components/rbac/Badges.tsx',
  'app/candidates/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/bg-blue-500/g, 'bg-primary')
    .replace(/bg-blue-600/g, 'bg-primary')
    .replace(/hover:bg-blue-700/g, 'hover:bg-primary/90')
    .replace(/hover:bg-blue-600/g, 'hover:bg-primary/90')
    .replace(/bg-blue-50/g, 'bg-primary/5')
    .replace(/bg-blue-100/g, 'bg-primary/10')
    .replace(/text-blue-500/g, 'text-primary')
    .replace(/text-blue-600/g, 'text-primary')
    .replace(/text-blue-700/g, 'text-primary')
    .replace(/text-blue-800/g, 'text-primary')
    .replace(/text-blue-900/g, 'text-primary')
    .replace(/border-blue-100/g, 'border-primary/10')
    .replace(/border-blue-200/g, 'border-primary/20')
    .replace(/border-blue-500/g, 'border-primary')
    .replace(/border-blue-600/g, 'border-primary')
    .replace(/ring-blue-500/g, 'ring-primary')
    .replace(/dark:bg-blue-900\/30/g, 'dark:bg-primary/30')
    .replace(/dark:text-blue-300/g, 'dark:text-primary')
    .replace(/dark:text-blue-400/g, 'dark:text-primary')
    .replace(/dark:border-blue-800/g, 'dark:border-primary/50');

  fs.writeFileSync(file, content);
}
