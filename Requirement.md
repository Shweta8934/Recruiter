
Workvibe Recruit
Recruitment SaaS Platform
Phase 1 MVP
Business Requirements & Implementation Document
Developer-facing specification for engineering, design, and QA
Version 1.0  
Table of Contents
1. Document Overview
2. Business Requirements (BRD)
    2.1 Goals & Success Criteria
    2.2 Personas & Roles
    2.3 Feature Requirements (by module)
    2.4 Out of Scope
    2.5 Assumptions, Constraints, Risks
3. Implementation Design
    3.1 Architecture Overview
    3.2 Tech Stack
    3.3 Multi-Tenancy Strategy
    3.4 Authentication & SSO
    3.5 RBAC Model
    3.6 Data Model
    3.7 Module-by-Module Implementation
    3.8 AI Layer
    3.9 File Storage, Email, Background Jobs
    3.10 Security & Compliance
    3.11 Observability
    3.12 Deployment & Environments
4. API Surface (key endpoints)
5. Delivery Plan & Milestones
6. Acceptance Criteria & Definition of Done
7. Appendix
1. Document Overview
1.1 Purpose
This document is a combined Business Requirements Document (BRD) and Implementation Specification for Phase 1 MVP of Workvibe Recruit, an AI-augmented recruitment platform for coding organizations. It is intended for engineering, design, QA, and product stakeholders building or reviewing the system.
1.2 Scope of Phase 1
Phase 1 delivers a deployable MVP covering the following capabilities:
Multi-tenant foundation with row-level isolation
Role-Based Access Control (RBAC) with predefined roles
Email/password authentication
Job postings, public application page, candidate profile
AI resume screening with explainability — and full manual screening alternative
Assessment engine: MCQ + coding, question library, AI-driven test generation
Basic proctoring (webcam snapshots + tab-switch detection)
Interview scheduling (Google Calendar) and structured panelist feedback
Kanban-style candidate pipeline
Candidate portal (status tracking, document hub)
Core analytics: funnel, time-to-hire, basic stage counts
Offer letter generation + e-signature (lower priority; deferrable if timeline slips)
1.3 Conventions
MUST / SHOULD / MAY follow RFC 2119 semantics for requirement priority
"Pilot org" refers to the first 10–20 person organization onboarded
"Tenant" = a single company/organization on the platform
All times are stored in UTC; displayed in user/candidate timezone
All API responses are JSON; all timestamps ISO 8601
2. Business Requirements (BRD)
2.1 Goals & Success Criteria
2.1.1 Primary Goals
Enable a 10–20 person coding organization to run its full hiring workflow on Workvibe Recruit 
Replace spreadsheets, scattered email threads, and manual test-link sharing with a single system of record
Demonstrate that AI-assisted screening and assessment generation reduce recruiter toil by at least 40%
Provide a measurable baseline for time-to-hire and candidate experience to inform Phase 2 priorities
2.1.2 Success Metrics
Metric
Target
Measurement
Recruiter onboarding time
< 30 minutes per recruiter
From first login to first job published
Candidate application completion rate
> 70%
Applications submitted / form starts
Assessment completion rate
> 60%
Tests submitted / invites sent
Time-to-hire (median)
20% reduction vs baseline
Days from application to offer accept
AI screening agreement
> 75%
Recruiter agrees with AI shortlist suggestion
System uptime
99.5%
Monthly uptime, business hours
P95 page load (key screens)
< 1.5 seconds
RUM data

2.2 Personas & Roles
2.2.1 Persona Summary
Persona
Goal
Pain to Solve
Recruiter / Admin
Hire fast and well
Manual screening, scattered tools, scheduling chaos
Hiring Manager
Confidence in shortlist
Lack of visibility, inconsistent feedback
Interviewer
Submit feedback quickly
Long feedback forms, context switching
Candidate
Know where I stand
Black-box process, no status updates

2.2.2 Roles & Permissions (Phase 1)
Phase 1 ships with four fixed roles. Custom role creation is deferred to Phase 2.
Role
Key Permissions
Owner
Full tenant access; billing; member management; delete tenant data
Recruiter / Admin
Create jobs; manage candidates; create/run assessments; schedule interviews; send offers
Interviewer
View only assigned candidates; submit structured feedback; view assigned interviews
Candidate (external)
View own application(s); take assessments; view interview schedules; view feedback if released

2.3 Feature Requirements
2.3.1 Multi-Tenant Foundation
Must support multiple isolated organizations on a single deployment without data leakage.
Functional Requirements
MUST scope all tenant data by tenant_id; every business table includes tenant_id column
MUST enforce tenant isolation at the API layer (middleware) AND database layer (row-level filter)
MUST allow a single user account to belong to multiple tenants (e.g., consultant on multiple panels)
MUST support tenant-scoped subdomain or path 
SHOULD allow per-tenant branding (logo, primary color) on candidate-facing pages
MAY support custom domain for candidate-facing career page (Phase 2)
Acceptance Criteria
A user from Tenant A cannot read or write any record belonging to Tenant B via API, even with manipulated request payloads
Switching tenant in the UI fully reloads context; no Tenant A data is rendered after switch
Database queries without tenant_id filter are blocked or fail loudly (enforced via test)
2.3.2 Authentication
Functional Requirements
MUST support email + password login with strong password policy (12+ chars, complexity rules)
MUST support password reset, email verification, session revocation
SHOULD lock account after 5 failed attempts (rolling 15-min window)


Candidate Auth (Phase 2)
Candidates apply without an account; receive magic link to create lightweight profile after first application
Candidate accounts are global (not tenant-scoped); a single candidate identity can apply to multiple tenants
2.3.3 Role-Based Access Control
Functional Requirements
MUST enforce RBAC at API layer for all mutating operations
MUST support role assignment per tenant per user
MUST scope Interviewer visibility to candidates with at least one interview/feedback assignment to them
SHOULD log all permission-denied attempts for security review
MAY allow Owner to define custom roles (Phase 2)
2.3.4 Jobs Module
Functional Requirements
MUST allow Recruiter/Admin to create, edit, publish, close, and archive jobs
MUST capture: title, department, location(s), employment type, experience range, compensation range (optional, visible to internal only), skills (tags), job description (rich text)
MUST generate a unique public URL per job (e.g., /jobs/:slug)
SHOULD provide AI JD generation: input title + skills + level → draft JD (editable before save)
MAY allow job templating / cloning (nice-to-have for Phase 1)
Job States
Draft 
Open 
Closed 
Archived
Only Open jobs are publicly visible.
2.3.5 Public Application & Candidate Profile
Functional Requirements
MUST present a public, mobile-responsive application form per job
MUST capture: name, email, phone, location, resume (PDF/DOCX, max 2MB), LinkedIn URL, GitHub URL, current company, years of experience, custom questions per job (max 5)
MUST parse uploaded resume into structured fields (skills, education, work history) using third-party API
MUST show parsed fields to candidate for confirmation/editing before final submit
MUST include explicit consent checkboxes: privacy policy, processing of personal data, communications opt-in
MUST send confirmation email with magic link to candidate portal
MUST deduplicate by email within a tenant; second application to same job is rejected with friendly message
SHOULD detect potential duplicate by phone + name
SHOULD support invitation-only links for sourced candidates (token-based)
2.3.6 AI Resume Screening with Explainability
Functional Requirements
MUST produce a match score (0–100) for each applicant against the job's JD + skills
MUST expose explainability: top reasons (matched skills, years of relevant experience, education fit) and top gaps
MUST allow Recruiter to disable AI screening per job (manual-only mode)
MUST allow Recruiter to override AI ranking; override is logged
MUST display AI score as advisory (clear labeling) — never auto-reject
SHOULD allow Recruiter to provide thumbs up/down feedback on screening for model tuning
MUST log model version + prompt version + score for every screening event (audit)
Manual Screening Mode
MUST provide a clean manual review UI with: resume preview, parsed fields, candidate answers
MUST allow tagging candidates: Shortlist, Hold, Reject (with reason)
MUST allow bulk actions across filtered candidate list
2.3.7 Assessment Engine
Question Library
MUST support two question types in Phase 1: Multiple Choice (single/multi) and Coding
MUST allow tagging questions by skill, difficulty (1–5), estimated time, and language (for coding)
MUST scope library private per tenant (no cross-tenant sharing in Phase 1)
MUST version questions: once attached to a published test, edits create a new version
SHOULD support AI question generation: given skill + difficulty + type → 3–5 candidate questions for review
MUST require admin review before AI-generated questions enter library
Test Creation
MUST allow manual test composition: pick specific questions from library
MUST allow AI test generation: given JD + duration → balanced draft test (admin reviews/edits)
MUST allow setting: total duration, per-section timing (optional), pass threshold, randomization (questions, options)
SHOULD allow practice mode for candidates (separate non-scoring attempt)
Test Delivery (Candidate Side)
MUST send unique test link to candidate with expiry (default 1 day, configurable)
MUST run a pre-test system check (browser, camera, network)
MUST show consent screen explaining proctoring before test begins
MUST auto-save responses every 15 seconds and on every navigation
MUST enforce timer (per-test and per-section if configured); auto-submit on expiry
MUST allow candidate to resume after disconnection within remaining time
MUST support code execution for coding questions in: Python, JavaScript, Java, Go, C++
MUST provide visible test cases (sample) and hidden test cases (graded) for coding questions
Proctoring (Basic — Phase 1)
MUST capture webcam snapshots at configurable intervals (default every 30 seconds) — stored, not AI-analyzed in Phase 1
MUST detect and count tab/window switches
MUST detect copy/paste events in coding editor
MUST enforce fullscreen mode; track fullscreen exit events
MUST flag candidates with > N events (configurable threshold) for human review
MUST NOT auto-reject candidates based on proctoring flags in Phase 1
Scoring
MUST auto-score MCQs (exact match)
MUST auto-score coding via test case pass rate
MUST apply configurable pass threshold per test
MUST allow Recruiter manual override of scores with reason
MUST notify Recruiter when test is submitted
2.3.8 Interview Scheduling & Feedback
Scheduling
MUST allow Recruiter to schedule interview by selecting: candidate, interviewer(s), date/time, duration, round name
MUST integrate with Google Calendar to create events with Google Meet link
MUST send calendar invites to candidate and interviewer(s)
MUST send reminder email 24 hours and 1 hour before interview
MUST handle reschedule and cancellation with notification to all parties
SHOULD allow candidate self-scheduling via shareable link (Phase 2)
Structured Feedback
MUST provide a feedback form per interview round with: 4–6 parameters (configurable per tenant), 1–5 rating with anchored descriptions, free-text comments, Hire/No-Hire/Strong-Hire/Strong-No-Hire recommendation
MUST hide other panelists' feedback until current interviewer submits (anti-anchoring)
MUST aggregate feedback on candidate page for Recruiter view
SHOULD highlight disagreement (e.g., one Strong-Hire + one Strong-No-Hire) for calibration
2.3.9 Candidate Pipeline (Kanban)
MUST display a fixed-stage Kanban: Applied → Shortlisted → Assessment → Interview → Offer → Hired / Rejected
MUST support drag-and-drop stage movement (Recruiter/Admin only)
MUST support adding other stages in between Applied and Hired/Rejected and ordered.
MUST support filters: job, stage, source, AI score range, application date, skill tags
MUST support a List view as alternative
MUST log every stage change with actor + timestamp + optional reason
MUST trigger configured email templates on stage transitions (e.g., Rejected → rejection email)

2.3.10 Candidate Portal (Phase 2)
MUST show candidate all applications across tenants they applied to
MUST show current stage and last update timestamp per application
MUST list upcoming assessments with start link and interview schedules
MUST host candidate-visible documents (offer letters, test results summary if released by tenant)
MUST allow candidate to withdraw application
MUST allow profile updates (resume, contact)
MUST allow data export and account deletion (GDPR compliance)
2.3.11 Core Analytics
MUST display a tenant-level dashboard with: total active jobs, candidates by stage, time-to-hire (median + p90), offer acceptance rate
MUST show a funnel chart per job (Applied → Shortlisted → Assessed → Interviewed → Offered → Hired)
MUST show stage drop-off rates and average time spent per stage
SHOULD support date range filter and per-job/department drilldown
MAY support CSV export of underlying data (Phase 2)
2.3.12 Offer Letter + E-Sign (Phase 2)
Note: This module is the lowest priority in Phase 1. If timeline slips, defer e-signature integration and ship offer letter generation + manual upload of signed copy.
MUST allow Recruiter to generate offer letter from template with merge fields (candidate name, role, comp, start date)
MUST allow Recruiter to send offer via email
MUST track offer status: Draft → Sent → Viewed → Accepted / Declined / Expired
SHOULD integrate with DocuSign (or equivalent) for e-signature
MAY fall back to: send PDF, candidate uploads signed PDF, Recruiter marks Accepted

2.3.13 Super Admin / platform console
2.3.14 Subscription management and billing automation
2.4 Future Scope Pointers
The following are explicitly excluded from Phase 1 and tracked for later phases:
Custom fields
LinkedIn / Naukri / Indeed job board integrations
Career site builder, branded subdomains beyond logo/color
AI interviewer (async or live)
Advanced proctoring (gaze tracking, AI anomaly detection, browser lockdown)
Talent CRM, passive sourcing, referrals, internal mobility
Mobile native apps
HRIS / ATS / BGV integrations
Multilingual UI
Free-text/video question types in assessments
Vendor/agency portal
Bulk import of historical candidates (admin-only CSV in Phase 1; full migration tool in Phase 2)
2.5 Assumptions, Constraints, Risks
2.5.1 Assumptions
Pilot org has stable internet for candidates and interviewers
Pilot org uses Google Workspace (drives and Calendar integration choice)
Pilot will run with English-only UI
Resume parsing and code execution are vendor-provided (not built in-house)
2.5.2 Top Risks
Risk
Impact
Mitigation
AI screening inaccuracy erodes trust
High
Always advisory; show reasoning; allow override; collect feedback
Code execution sandboxing security gap
High
Use Judge0/HackerEarth; never run candidate code in main backend
Proctoring privacy/legal pushback
Medium
Explicit consent flow; allow opt-out with recruiter awareness; document data retention
Resume parser quality varies
Medium
Show all parsed fields editable before save
Candidate drop-off during assessment
Medium
Practice mode, clear instructions, reminder emails, mobile preview link
Calendar integration fragility
Medium
Implement webhook + reconciliation job; fallback to email-only invites
AI cost overrun
Low
Use Haiku for parsing/short tasks; budget alerts; per-tenant token caps

3. Implementation Design
3.1 Architecture Overview
Workvibe Recruit Phase 1 is a web application with isolated vendor integrations for compute-heavy or risk-heavy concerns (code execution, AI, email). A modular monolith is preferred over microservices for Phase 1 to minimize ops overhead and ship fast; module boundaries are designed to allow extraction later.
3.1.1 High-Level Component View
┌──────────────────────────────────────────────────────────────────┐
│                       Client (Browser)                            │
│  Next.js (recruiter app) | Next.js (candidate portal & public)    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS / REST + WSS
┌────────────────────────────▼─────────────────────────────────────┐
│                  API Gateway / App Server                         │
│        NestJS (TypeScript) — modular monolith                     │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐       │
│  │  Auth    │  Jobs    │ Candidate│Assessment│ Interview│       │
│  │  RBAC    │          │  & Pipe  │  Engine  │  & Offer │       │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘       │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┬───────┘


3.1.2 Module Boundaries
auth: login, sessions, 
tenants: organization records, members, branding
rbac: roles, permissions, policy enforcement
jobs: job CRUD, public listing, JD AI generation
candidates: applications, profile, deduplication, parsing orchestration
pipeline: stage management, kanban, bulk actions
screening: AI screening orchestration, explainability, manual mode
assessments: question library, tests, sessions, scoring, proctoring events
interviews: scheduling, calendar integration, feedback collection
offers: letter generation, e-sign integration (phase 2)
notifications: email templates, dispatch, audit
analytics: read models for funnel/time-to-hire dashboards
ai: provider abstraction, prompt registry, model selection, cost logging






3.2 Tech Stack
Layer
Choice
Rationale
Frontend
Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui
Modern DX, server components reduce JS payload, fast
State (FE)
TanStack Query + Zustand
Server-cache + lightweight client state
Backend
NestJS (Node.js, TypeScript)
Module structure aligns with monolith design
Database
MySQL 
Relational; row-level security; JSON for flexible fields
ORM
Prisma
Type-safe; migration tooling; matches TS stack
Cache / Sessions - EVALUATE
Redis (Upstash or managed)
Sessions, rate limits, ephemeral state
Background jobs - EVALUATE
BullMQ (Redis-backed)
Email, parsing, AI calls, calendar sync
Auth
Auth.js (NextAuth) or Clerk
Don't build auth in-house
File storage – Use which is Free for long run
S3 or Cloudflare R2
Resumes, snapshots, offer letters
Email
SendGrid or AWS SES
Reliable transactional email
Resume parsing
Affinda (or RChilli)
Best-in-class parsing API
Code execution
Judge0 self-hosted (or HackerEarth API)
Don't build sandboxing
Video
Google Meet via Calendar API
Free, ubiquitous, zero ops
E-sign (Phase 2)
DocuSign (or skip — manual upload)
Standard, deferrable
Observability
Sentry + Axiom/Datadog
Errors + logs + metrics
Product analytics
PostHog (self-host or cloud)
Funnels, retention, feature flags
Hosting
Hostinger Shared Hosting
Fast deploys, low ops
CI/CD
GitHub Actions
Standard
IaC - EVALUATE
Terraform (optional Phase 1)
Reproducible infra

3.3 Multi-Tenancy Strategy
Phase 1 uses shared-database, shared-schema multi-tenancy with a tenant_id column on every business table. This is the simplest model and adequate for pilot scale (< 100 tenants, < 1M rows per major table).
3.3.1 Tenant Resolution
Resolved from JWT claim tenant_id on every authenticated request
For public job pages, resolved from job slug → job → tenant_id (read-only)
For candidate portal, candidate_id is global; tenant context resolved per application view
3.3.2 Isolation Enforcement
API middleware: extracts tenant_id from JWT, injects into request context
Service layer: every query MUST pass tenant_id from context; lint rule + code review checklist
Database: optional Postgres Row-Level Security policy as defense-in-depth (recommended)
Test suite: dedicated 'cross-tenant leak' integration tests for every entity
3.3.3 Per-Tenant Configuration
Stored in a tenants_settings table (JSONB) for flexibility:
{
  "branding": { "primaryColor": "#1F4E79", "logoUrl": "..." },
  "assessment": { "proctorSnapshotIntervalSec": 30, "flagThreshold": 3 },
  "screening": { "aiEnabled": true, "defaultMode": "ai-assisted" },
  "emailTemplates": { ... },
  "interview": { "feedbackParams": [...] }
}
3.4 Authentication & SSO
3.4.1 Tenant Member Auth
Email + password (Argon2id hashing, 12+ chars)
Session: JWT (15 min) + refresh token (7 days, rotating); stored in httpOnly secure cookies
Account lockout: 5 failed attempts in 15 minutes = 30-min lockout
3.4.2 Candidate Auth (Phase 2)
Magic link primary; 
No password by default (reduces friction); candidate may set one if desired
Candidate identity is global across tenants
3.4.3 Auth Flow Diagrams (high-level)
Email/Password Login:
  Client → POST /auth/login {email, password}
  → verify password (Argon2)
  → check MFA required → if yes, return 202 with mfa_token
  → on success: issue access + refresh tokens (httpOnly cookies)





3.5 RBAC Model
3.5.1 Permission Catalog (Phase 1)
Permissions follow resource:action pattern. The full Phase 1 catalog is fixed (no custom roles).
Permission
Owner
Recruiter
Interviewer
Candidate
tenant:manage
✓
—
—
—
member:invite
✓
—
—
—
job:create / edit / publish
✓
✓
—
—
candidate:read (all)
✓
✓
—
—
candidate:read (assigned)
✓
✓
✓
—
candidate:move-stage
✓
✓
—
—
assessment:create
✓
✓
—
—
assessment:take
—
—
—
✓
interview:schedule
✓
✓
—
—
interview:submit-feedback
✓
✓
✓
—
offer:create / send
✓
✓
—
—
own-application:read
—
—
—
✓

3.5.2 Enforcement
Decorator on every controller method: @RequirePermission('candidate:move-stage')
Guard checks user's role for the active tenant against permission catalog
Row-level scope for Interviewer: query is filtered by 'candidate has interview assigned to this user'
Permission-denied attempts logged with: user_id, tenant_id, permission, resource_id, timestamp
3.6 Data Model
Core entities and relationships. All business tables include tenant_id (except global tables: users, candidates, audit logs).
3.6.1 Core Entities (simplified)
users (global)
  id, email (unique), name, password_hash, mfa_secret,
  google_id, created_at, last_login_at, status


tenants
  id, name, slug (unique), logo_url, primary_color,
  settings (jsonb), status, created_at


tenant_memberships
  id, tenant_id, user_id, role (enum: owner|recruiter|interviewer),
  status (active|invited|suspended), invited_by, joined_at


candidates (global)
  id, email (unique), phone, name, profile_data (jsonb),
  status, created_at


jobs
  id, tenant_id, slug (unique within tenant), title,
  description, skills (jsonb), location, experience_min, experience_max,
  comp_min, comp_max, employment_type, status, created_by, created_at


applications
  id, tenant_id, job_id, candidate_id,
  resume_url, parsed_data (jsonb), answers (jsonb),
  source, ai_score, ai_explanation (jsonb), stage,
  applied_at, last_stage_change_at


stage_transitions (audit)
  id, application_id, from_stage, to_stage, actor_user_id,
  reason, occurred_at


questions (assessment)
  id, tenant_id, type (mcq|coding), title, body, options (jsonb),
  correct_answer (jsonb), test_cases (jsonb), language,
  skill_tags (jsonb), difficulty, estimated_time_sec, version,
  created_by, created_at


assessments
  id, tenant_id, job_id (nullable), title, duration_sec,
  pass_threshold, sections (jsonb of question_ids),
  randomize, proctor_config (jsonb), status, created_by


assessment_sessions
  id, assessment_id, application_id, candidate_id, tenant_id,
  started_at, submitted_at, expires_at, total_score,
  pass_status, proctor_flags (jsonb), responses (jsonb), state


proctor_events
  id, session_id, type (tab_switch|paste|fullscreen_exit|snapshot),
  payload (jsonb), occurred_at


interviews
  id, tenant_id, application_id, round_name, scheduled_at,
  duration_sec, calendar_event_id, meet_link, status


interview_panelists
  id, interview_id, user_id, role (interviewer|observer)


interview_feedback
  id, interview_id, user_id, ratings (jsonb), recommendation,
  comments, submitted_at


offers
  id, tenant_id, application_id, letter_url, sent_at,
  viewed_at, signed_at, status, esign_envelope_id


audit_logs (global)
  id, tenant_id, actor_user_id, action, resource_type,
  resource_id, payload (jsonb), ip, user_agent, occurred_at
3.6.2 Indexes
Every (tenant_id, X) for X in foreign-key columns
applications: (tenant_id, job_id, stage); (tenant_id, candidate_id)
audit_logs: (tenant_id, occurred_at desc); (actor_user_id, occurred_at desc)
Full-text on candidates.name, candidates.email, application parsed skills (jsonb GIN)
3.7 Module-by-Module Implementation
3.7.1 Jobs Module
Create job: POST /jobs → validates, generates slug, stores draft
Publish: POST /jobs/:id/publish → moves to Open, creates public_listing record (denormalized for fast public read)
Public read: GET /public/jobs/:tenantSlug/:jobSlug (no auth) → reads from public_listing cache
AI JD generation: POST /jobs/:id/ai-jd → calls AI service with structured prompt; returns draft; user edits before save
3.7.2 Application & Parsing
Submit: POST /public/applications → validate, upload resume to S3, enqueue parse job
Parse worker: pulls job, calls Affinda API, persists parsed_data, marks application ready
Enqueue AI screening (if enabled for job)
Send confirmation email with magic link to candidate portal
Idempotency: hash of (email + job_id) prevents duplicates
3.7.3 AI Resume Screening
Async pipeline triggered after parsing completes.
Flow:
  1. Worker reads application + parsed_data + job (JD, skills)
  2. Build prompt with structured candidate profile + job criteria
  3. Call Claude Sonnet with JSON output schema:
     { score: 0-100, matched_skills: [], gaps: [],
       experience_fit: 'low|med|high',
       reasoning: 'short paragraph',
       red_flags: [], green_flags: [] }
  4. Persist ai_score + ai_explanation + model_version + prompt_version
  5. Log token usage and cost
  6. Notify recruiter (digest, not per-candidate)


Explainability UI:
  - Score badge with color coding
  - 'Why this score?' panel: matched skills, gaps, reasoning
  - Always show 'AI Advisory' label
  - Override button with reason capture
3.7.4 Assessment Engine
Question Authoring
UI: Markdown editor for body; structured options for MCQ; code editor for sample/hidden test cases
AI generation endpoint: POST /questions/ai-generate {skill, difficulty, type} → returns 3–5 drafts → admin saves chosen ones
Versioning: edit creates new version row; published tests reference specific version
Test Composition
Manual: select question IDs into sections with order
AI: POST /assessments/ai-generate {jd, duration, skills} → returns proposed structure → admin edits
Validation: total estimated time ≤ duration; questions exist; languages compatible
Candidate Test Session
Invitation: signed JWT link, expires per config
Pre-test: system check, consent screen, practice question
Session start: creates assessment_session row, initializes responses
Auto-save: PATCH /sessions/:id/responses every 15s; debounced
Timer: server-authoritative; client polls remaining time every 10s
Code execution: candidate clicks 'Run' → POST /sessions/:id/execute → Judge0 API → return stdout/stderr/test results
Submit: POST /sessions/:id/submit → final scoring → notify recruiter
Proctoring
Client captures (browser APIs):
  - getUserMedia for camera; canvas → JPEG every N sec → upload
  - Document Visibility API → tab switch events
  - Fullscreen API → enforce + detect exit
  - Clipboard events on code editor


All events POST /sessions/:id/proctor-events with payload
Server aggregates; if event count > threshold, sets flag
Recruiter views flagged sessions with snapshot timeline
3.7.5 Interview Scheduling
OAuth flow: Recruiter connects Google Calendar (per-tenant or per-user; Phase 1 = per-user)
Create interview: POST /interviews → server creates calendar event via Google API → stores event_id + meet_link
Sync: webhook from Google Calendar updates local state on reschedule/cancel
Reconciliation job: hourly sweep to detect drift
Reminders: scheduled jobs at T-24h and T-1h
3.7.6 Structured Feedback
Form definition: tenant settings store feedback_params: [{name, description, scale}]
Default params: Technical Skill, Problem Solving, Communication, Culture Fit (Owner can edit per tenant)
Submission: POST /interviews/:id/feedback {ratings, recommendation, comments}
Hide-until-submit: GET /interviews/:id/feedback returns own + (others if user has submitted)
Aggregation: averages computed on read for candidate page
3.7.7 Kanban Pipeline
UI: React DnD or dnd-kit; column per stage; lazy load cards per column
Move: optimistic UI update → PATCH /applications/:id/stage {to_stage, reason} → server validates allowed transition → emits domain event
Events trigger: email notification, stage_transition log, analytics update
Filter chips persist in URL params for shareable views
3.7.8 Candidate Portal (Phase 2)
Auth: magic link or Google SSO
Home: list of applications across tenants with stage + last update
Detail: timeline, upcoming assessments/interviews, documents, withdraw button
Profile: edit contact info, replace resume (creates new version, doesn't overwrite tenant-side parsed data)
Data export: POST /candidate/export → background job → email with download link
Delete account: soft delete + 30-day recovery window; then hard delete
3.7.9 Analytics
Approach: read models (materialized views or pre-aggregated tables) refreshed on stage_transition events
Tables: funnel_daily (tenant_id, job_id, date, stage, count), time_to_hire_rollup, offer_acceptance_rollup
Refresh: trigger-based on writes + nightly full refresh as safety net
Dashboard endpoint: GET /analytics/overview?dateFrom&dateTo → returns precomputed metrics
Charts: Recharts (frontend); funnel + bar + line + KPI cards
3.7.10 Offers + E-Sign (Phase 2)
Template: stored as HTML with merge variables {{candidate.name}}, {{role.title}}, etc.
Generate: POST /offers → server renders HTML → wkhtmltopdf or Puppeteer → PDF stored in S3
Send: email with link + DocuSign envelope (if enabled)
Webhook from DocuSign updates status
Fallback (if e-sign deferred): candidate downloads, prints, signs, uploads signed PDF; recruiter marks Accepted
3.8 AI Layer
3.8.1 Provider Abstraction
Single internal AiService with methods: generateText, generateStructured(schema), scoreResume, generateQuestion, generateTest
Provider: Anthropic Claude API; configurable model per task (Sonnet for generation, Haiku for cheap structured extraction)
Prompts stored in a versioned registry (db table or files in repo) — every call logs prompt_version
All AI calls go through a single rate-limited, retried, cost-logged client
3.8.2 Cost & Safety Controls
Per-tenant monthly token budget; alarm at 80%, hard cap at 100% with admin notification
Per-request timeout (default 30s); fallback message on failure (do not block user flows)
PII minimization: don't pass full resume text if structured fields suffice
Prompt injection defense: never put candidate text into system prompt without delimiters
3.8.3 Example Prompt Schemas
// Resume screening (structured output)
{
  "system": "You are an expert recruiter evaluator. Output strictly JSON.",
  "user": {
    "job": { title, skills_required, experience_min, jd_summary },
    "candidate": { skills, education, experience_years, work_history }
  },
  "output_schema": {
    "score": "int 0-100",
    "matched_skills": "string[]",
    "gaps": "string[]",
    "reasoning": "string (<= 80 words)"
  }
}

3.9 File Storage, Email, Background Jobs
3.9.1 File Storage
S3-compatible (AWS S3 or Cloudflare R2)
Buckets: resumes, snapshots, offers, exports
Resumes: server-side encryption, signed URLs for download (15-min expiry)
Snapshots: lifecycle policy → delete after 90 days unless flagged session
3.9.2 Email
SendGrid (or SES) for transactional
Templates stored in DB (tenant overrides allowed); rendered with Handlebars
All sends logged: notification_id, recipient, template, status (queued|sent|failed|delivered|bounced|opened)
Bounce/complaint webhooks update candidate communication status
3.9.3 Background Jobs
BullMQ queues: parsing, screening, ai-generation, email, calendar-sync, analytics-rollup
Retry policy: exponential backoff, max 5 retries, dead letter queue
Idempotency keys on every job
Worker processes deployed separately from API; scale independently
3.10 Security & Compliance
Transport: TLS 1.2+ everywhere; HSTS enabled
At-rest: AES-256 (managed by storage provider); resumes encrypted with KMS-managed keys
Secrets: stored in env vars (Hostinger)
CSRF: SameSite=Lax cookies + double-submit token on state-changing requests
XSS: React escapes by default; sanitize rich-text JD with DOMPurify
Rate limiting: per-IP for public endpoints; per-user for authenticated
PII handling: explicit lists of PII fields; logs scrub PII; data export on request; deletion within 30 days
Consent: explicit at application time; proctoring consent before test
Audit logs: immutable append-only; retained 1 year minimum
Dependency scanning: Dependabot + npm audit in CI
Penetration test: scheduled before pilot launch
3.11 Observability
Errors: Sentry (frontend + backend), Slack alerting on regression
Logs: structured JSON (pino); shipped to Axiom or Datadog
Metrics: request latency, error rate, queue depth, AI token spend, DB connection pool, code-exec latency
Dashboards: API health, candidate funnel realtime, AI cost daily
Alerts: P95 latency > 2s for 5min; error rate > 1% for 5min; queue depth > 1000; AI cost > budget
Tracing: OpenTelemetry on key flows (application submit, screening, test session)
3.12 Deployment & Environments
3.12.1 Environments
local — Docker Compose; PG, Redis, Mailpit, MinIO
dev — auto-deploy on main merge; seeded test data; Judge0 self-hosted
staging — pre-prod; mirror of prod config; used for pilot dry-run
prod — pilot tenant; backups every 4h; PITR enabled
3.12.2 CI/CD
GitHub Actions: lint, typecheck, unit tests, integration tests, build → deploy on green
Preview deploys for every PR
DB migrations: Prisma Migrate; reviewed in PR; applied in deploy step with backout plan
Feature flags via PostHog for gradual rollout (AI screening, AI test generation)
3.12.3 Backups & DR
Postgres: automated daily backup + 5-minute PITR window
S3: versioning enabled; cross-region replication for resumes
RTO target: 4 hours; RPO: 15 minutes
Disaster recovery runbook documented before pilot
4. API Surface (key endpoints)
Full OpenAPI spec to be generated and maintained alongside code. Below is the high-level inventory for Phase 1.
4.1 Conventions
Base: /api/v1
Auth: Bearer JWT in cookie or Authorization header
Tenant context: derived from JWT (no tenant_id in URL for member endpoints)
Errors: RFC 7807 problem+json
Pagination: cursor-based; ?cursor=...&limit=20; default 20, max 100
4.2 Endpoint Inventory
Module
Method + Path
Description
Auth
POST /auth/login
Email/password login
Auth
POST /auth/refresh
Rotate tokens
Auth
POST /auth/logout
Revoke session
Tenants
GET /tenants/me
Current tenant context
Tenants
PATCH /tenants/me
Update tenant settings (Owner only)
Members
POST /members/invite
Invite team member
Members
GET /members
List tenant members
Members
PATCH /members/:id
Change role / deactivate
Jobs
POST /jobs
Create job (draft)
Jobs
GET /jobs
List tenant jobs (filters)
Jobs
GET /jobs/:id
Get job detail
Jobs
PATCH /jobs/:id
Update job
Jobs
POST /jobs/:id/publish
Publish job
Jobs
POST /jobs/:id/close
Close job
Jobs
POST /jobs/:id/ai-jd
AI-generate JD draft
Public
GET /public/jobs/:tenantSlug/:jobSlug
Public job page data
Public
POST /public/applications
Submit application
Applications
GET /applications
List with filters
Applications
GET /applications/:id
Detail with timeline
Applications
PATCH /applications/:id/stage
Move stage
Applications
POST /applications/bulk-action
Bulk move / reject
Screening
POST /applications/:id/rescore
Re-trigger AI screening
Screening
POST /applications/:id/override-score
Manual override
Questions
POST /questions
Create question
Questions
GET /questions
Library with filters
Questions
PATCH /questions/:id
Edit (new version)
Questions
POST /questions/ai-generate
AI question drafts
Assessments
POST /assessments
Create test
Assessments
POST /assessments/ai-generate
AI test from JD
Assessments
POST /assessments/:id/invite
Invite candidates
Sessions (candidate)
POST /sessions/start
Begin test from invite token
Sessions
PATCH /sessions/:id/responses
Auto-save
Sessions
POST /sessions/:id/execute
Run code (Judge0 proxy)
Sessions
POST /sessions/:id/proctor-events
Push proctor events
Sessions
POST /sessions/:id/submit
Submit test
Interviews
POST /interviews
Schedule interview
Interviews
GET /interviews
List (scoped by role)
Interviews
PATCH /interviews/:id
Reschedule
Interviews
DELETE /interviews/:id
Cancel
Interviews
POST /interviews/:id/feedback
Submit feedback
Interviews
GET /interviews/:id/feedback
View (gated)
Offers
POST /offers
Create offer letter
Offers
POST /offers/:id/send
Send to candidate
Offers
POST /offers/:id/sign-webhook
DocuSign webhook
Analytics
GET /analytics/overview
Dashboard metrics
Analytics
GET /analytics/funnel
Funnel per job
Candidate Portal
GET /candidate/applications
Own applications
Candidate Portal
POST /candidate/withdraw
Withdraw application
Candidate Portal
POST /candidate/export
GDPR export
Candidate Portal
DELETE /candidate/account
Account deletion

4.3 Webhook Endpoints
POST /webhooks/sendgrid (delivery, bounce, complaint)
POST /webhooks/google-calendar (event updated/cancelled)
POST /webhooks/docusign (envelope status)
POST /webhooks/judge0 (execution complete — if async mode used)







	
5. Delivery Plan & Milestones
5.1 Milestone Schedule 
Week
Milestone
Demo-able Outcome
1
Foundations
Auth tenant scaffold, RBAC guard, base layout
2
Jobs
Create/edit/publish jobs; public job page; AI JD draft
3
Applications + Parsing
Public application form; resume upload; parsing pipeline; candidate timeline
4
Pipeline + AI Screening
Kanban board; AI screening with explainability; manual screening mode
5
Assessment Authoring
Question library; AI question generation; manual test composition
6
Assessment Taking
Candidate test session; coding execution (Judge0); auto-save; timer
7
Proctoring + Scoring
Camera snapshots; tab-switch detection; auto-scoring; flagged review UI
8
Interviews + Feedback
Calendar integration; scheduling; structured feedback form; aggregation
9
Portal + Analytics + Offers
Candidate portal; dashboard; offer letter generation; optional e-sign
10
Hardening + Pilot Onboarding
Bug bash; load test; pilot tenant setup; recruiter training; go-live

5.2 Definition of Ready (per ticket)
User story with acceptance criteria
Design mock attached (for UI tickets)
API contract specified (for backend tickets)
Test approach noted
Dependencies identified and unblocked
5.3 Definition of Done (per ticket)
Code merged to main with passing CI
Unit tests for service-layer logic; integration test for happy path
API endpoint documented in OpenAPI
Deployed to staging and smoke-tested
PM/designer sign-off on UI tickets
6. Acceptance Criteria & Definition of Done (System-level)
6.1 Functional Acceptance
Phase 1 is accepted for pilot launch when ALL of the following pass:
A new tenant can be provisioned in < 10 minutes by Owner self-service flow
Owner can invite Recruiter and Interviewer; each can log in and access role-appropriate screens
Recruiter can create, publish, and close a job; public URL returns expected job content
Candidate can apply via public URL, upload resume, see parsed fields, confirm and submit; receives confirmation email
AI screening produces a score and explanation within 60 seconds of submission for 95% of applications
Recruiter can disable AI screening for a job and use only manual review
Recruiter can author MCQ and coding questions, generate AI drafts, and compose a test
Candidate can take a test end-to-end: receive invite, pre-test check, answer questions, run code, submit; receive confirmation
Test session captures proctoring events; recruiter can view flagged sessions
Recruiter can schedule interview; Google Calendar event is created with Meet link; reminders fire 24h and 1h before
Interviewer can submit structured feedback; cannot see others' feedback until they submit
Recruiter can move candidate across all Kanban stages; transitions are logged
Candidate sees real-time stage status in candidate portal
Dashboard shows funnel and time-to-hire for jobs with completed pipelines
Recruiter can generate offer letter, send to candidate, and track status (manual or e-sign)
6.2 Non-Functional Acceptance
99.5% uptime over a 7-day pre-launch monitoring window
P95 API latency < 500ms for read endpoints, < 1.5s for write endpoints
P95 page load < 1.5s on recruiter dashboard and candidate portal
Load test: 100 concurrent candidates in active assessment sessions without degradation
Zero critical or high-severity vulnerabilities in pre-launch pen test
All cross-tenant isolation tests pass
All PII fields confirmed encrypted at rest
GDPR data export and account deletion flows verified end-to-end
6.3 Pilot Readiness Checklist
Production environment provisioned with backups
Monitoring and alerting wired to on-call rotation
Runbooks: incident response, DB restore, queue stuck, AI vendor outage
Pilot tenant created with org branding
Pilot team onboarded (live session); training video recorded
Support Slack channel created; SLA agreed (e.g., 4h response during business hours)
Pilot agreement signed (data ownership, exit, SLA, feedback cadence)
7. Appendix
7.1 Glossary
Term
Definition
Tenant
An organization (customer) on the platform
Application
A candidate's submission to a specific job
Stage
A step in the recruitment pipeline (Applied, Shortlisted, etc.)
Assessment
A test composed of questions; assigned to a candidate
Session
A specific candidate's attempt at an assessment
Panelist
An interviewer assigned to an interview
Proctor event
An observed signal during an assessment (tab switch, snapshot)
Explainability
Human-readable justification for an AI decision
RBAC
Role-Based Access Control
RPO / RTO
Recovery Point / Time Objective for disaster recovery

7.2 Open Decisions (to confirm before kickoff)
Decision
Options
Owner
Auth provider
Auth.js (build) vs Clerk (buy) vs Firebase
Tech Lead
Code execution
Judge0 self-host vs HackerEarth API
Tech Lead
Resume parser
Affinda vs RChilli vs Sovren
PM
Pilot pricing
Free vs discounted vs full
Founder
Custom domain for candidate page
Subdomain only vs custom in Phase 1
PM



