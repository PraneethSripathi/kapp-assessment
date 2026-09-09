# KAPP Assessment Platform

A production-ready online examination platform for the MIS Executive hiring assessment. Built with Next.js, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL.

## Features

### Candidate
- Registration with validation
- Assessment instructions and dashboard
- Timed MCQ assessment (20 questions per set, 4 sets)
- Answer auto-save to database on each selection
- Question navigation with answered/unanswered indicators
- Practical Excel assessment file download
- Completed workbook upload
- Submission confirmation with unanswered question count
- Refresh-safe: timer, answers, and set assignment persist across page reloads

### Admin
- Secure login with NextAuth.js
- Dashboard with stats (total, active, completed, passed, failed, pending evaluation)
- Candidate list with search and status filtering
- Detailed MCQ review: candidate answers vs correct answers with explanations
- Category-wise performance breakdown (Formula, Scenario, Calculation)
- Practical submission download and manual evaluation
- Score and result calculation with configurable passing criteria
- CSV export of all results

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM v6)
- **Auth**: NextAuth.js v5
- **File Storage**: Vercel Blob (production) / local filesystem (development)
- **Validation**: Zod

## Assessment Structure

4 question sets, each containing:
- 10 Excel Formula-Based MCQs
- 5 Scenario-Based MCQs
- 5 Calculation-Based MCQs
- 1 Practical Excel workbook with 5 tasks

Sets are randomly assigned to candidates. MCQ scoring is automatic; practical scoring is done by admin.

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or hosted: Neon, Supabase, etc.)

### Installation

```bash
git clone <repo-url>
cd kapp-assessment
npm install
```

### Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Generate with `openssl rand -base64 32`
- `AUTH_URL` - Application URL (http://localhost:3000 for dev)
- `ADMIN_EMAIL` - Admin login email (used during seed)
- `ADMIN_PASSWORD` - Admin login password (used during seed)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token (production only)

### Database Setup

```bash
# Push schema to database
npx prisma db push

# Seed assessment data (80 MCQs + 4 practical assessments + admin user)
npm run db:seed

# (Optional) Open Prisma Studio
npm run db:studio
```

### Running Locally

```bash
npm run dev
```

- Candidate registration: http://localhost:3000
- Admin login: http://localhost:3000/admin/login
- Default admin: admin@kapp.com / Admin@123

## Assessment Data Import

All 80 MCQ questions, answer keys, and practical assessment configurations are imported from the provided assessment files via `prisma/seed.ts`. The seed script:

1. Creates the admin user
2. Creates the assessment with configurable duration and passing criteria
3. Creates 4 question sets with 20 questions each
4. Creates all options and answer keys
5. Configures 4 practical assessments linked to their Excel workbooks

The practical Excel workbooks are stored in `public/practical-files/`.

## Vercel Deployment

1. Push to GitHub
2. Import in Vercel
3. Set environment variables:
   - `DATABASE_URL` (use Neon or Supabase PostgreSQL)
   - `AUTH_SECRET`
   - `AUTH_URL` (your Vercel domain)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `BLOB_READ_WRITE_TOKEN` (for file uploads)
4. Deploy
5. Run database setup after first deploy: `npx prisma db push && npm run db:seed`

## File Storage

- **Development**: Uploaded files stored in `uploads/submissions/` directory
- **Production**: Uploaded files stored in Vercel Blob with secure URLs
- Practical assessment workbooks served from `public/practical-files/`

## Security

- Answer keys never sent to candidate-facing API endpoints
- Server-side timer validation (cannot be reset via browser)
- Admin routes protected with NextAuth.js session verification
- All inputs validated with Zod schemas
- Question set assignment locked after first assignment
- File uploads validated for type and size
- Candidate cannot access other candidates' data or files
- MCQ scoring performed server-side only
