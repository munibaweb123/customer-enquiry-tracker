# Customer Enquiry Tracker

A small full-stack web application for collecting customer enquiries, saving them to a persistent database, automatically categorizing them using a supplied mock AI service, and tracking follow-up status.

## Features

- Public enquiry form with name, email, and message validation.
- FastAPI backend with server-side validation.
- Persistent PostgreSQL storage using Supabase.
- Automatic enquiry categorization using the supplied mock service.
- Allowed categories: `Sales`, `Support`, `Billing`, `Other`.
- Separate business status and categorization state.
- Dashboard with newest-first listing, status filtering, and status updates.
- Manual retry for failed categorization without creating duplicate enquiries.
- Loading, success, and error feedback.

## Technology Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Python, FastAPI
- Python dependency management: `uv`
- Database: Supabase PostgreSQL
- Mock categorization service: Node.js

## Project Structure

```text
customer-enquiry-tracker/
├── backend/
│   ├── main.py
│   ├── .env
│   ├── routes/
│   │   ├── enquiries.py
│   │   └── health.py
│   └── services/
│       └── categorization.py
├── frontend/
│   └── app/
│       ├── page.tsx
│       └── dashboard/
│           └── page.tsx
├── docs/
├── mock-ai-service.mjs
├── README.md
└── .gitignore
```

## Prerequisites

- Node.js 18 or newer
- Python version compatible with the backend dependencies
- `uv`
- A Supabase PostgreSQL database

## Configuration

Create `backend/.env` with the following variables:

```env
DATABASE_URL=your_supabase_postgresql_connection_string
MOCK_AI_URL=http://127.0.0.1:8787/categorize
```

Replace the database placeholder with your own connection string. Never commit real credentials or secrets.

## Database Initialization

Create the `public.enquiries` table in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'New'
        CHECK (status IN ('New', 'In Progress', 'Resolved')),
    category TEXT DEFAULT NULL
        CHECK (category IS NULL OR category IN ('Sales', 'Support', 'Billing', 'Other')),
    categorization_state TEXT NOT NULL DEFAULT 'Pending'
        CHECK (categorization_state IN ('Pending', 'Completed', 'Failed'))
);

CREATE INDEX IF NOT EXISTS idx_enquiries_created_at
    ON public.enquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enquiries_status
    ON public.enquiries (status);
```

## Running the Application

Run each component in a separate terminal.

### 1. Start the mock service

From the project root:

```powershell
node mock-ai-service.mjs
```

Keep this terminal running.

Verify the service at `http://127.0.0.1:8787/health`. It should return a status of `ok`.

### 2. Start the backend

```powershell
cd backend
uv sync
uv run uvicorn main:app --reload
```

Backend URL: `http://127.0.0.1:8000`

Interactive API documentation: `http://127.0.0.1:8000/docs`

Database health check: `http://127.0.0.1:8000/health/database`

### 3. Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Dashboard: `http://localhost:3000/dashboard`

For production build verification:

```powershell
npm run build
npm run start
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/enquiries` | Validate, save, and categorize an enquiry |
| GET | `/api/enquiries` | List enquiries newest first |
| GET | `/api/enquiries?status=New` | Filter enquiries by business status |
| PATCH | `/api/enquiries/{id}` | Update business status |
| POST | `/api/enquiries/{id}/retry` | Retry failed categorization |
| GET | `/health` | Backend health check |
| GET | `/health/database` | Database connectivity check |

### Example: Create an enquiry

Request:

```json
{
  "name": "Example Customer",
  "email": "customer@example.com",
  "message": "Please send pricing for your automation service."
}
```

Successful response: HTTP `201 Created`.

The response includes the saved enquiry ID, creation timestamp, business status, category, and categorization state.

### Example: Update status

```json
{
  "status": "In Progress"
}
```

Send this JSON to `PATCH /api/enquiries/{id}` using the saved enquiry ID.

### Mock categorization request

The backend sends:

```json
{
  "enquiryId": "saved-database-id",
  "message": "Please send pricing for your automation service."
}
```

A successful mock response is:

```json
{
  "category": "Sales"
}
```

## Categorization and Retry Behavior

The application saves an enquiry before calling the mock service.

- A valid category is saved with categorization state `Completed`.
- A timeout, non-success HTTP response, malformed response, or invalid category results in state `Failed` and a null category.
- Failed enquiries remain stored.
- Manual retry uses the same saved enquiry ID and updates the existing record.
- Business status remains separate from categorization state.

The mock service simulates predictable outcomes for assessment. It is not a real AI model.

## Verification Notes

Record the results of these manual checks before submission:

| Check | Result |
|---|---|
| Valid enquiry saved and persists after refresh | Passed |
| Invalid email rejected in the browser | Passed |
| Blank required fields rejected in the browser | Passed |
| Invalid email rejected by backend with HTTP 422 | Passed |
| Valid category assigned and displayed | Passed |
| `[FAIL_ONCE]` enquiry retained in Failed state | Passed |
| Retry recovers categorization without a duplicate | Passed |
| `[INVALID_ONCE]` response rejected and retry recovers | Passed |
| Business status persists after refresh | Passed |
| Status filter returns matching enquiries | Passed |
| Next.js production build completes successfully | Passed |

The invalid-email backend test returned HTTP 422. Database absence for that rejected request was not separately verified by a direct row-count check.

## Limitations and Trade-offs

- The supplied mock categorization service uses deterministic test rules, not a real AI model.
- Categorization is synchronous, with a bounded HTTP timeout.
- The dashboard is a local assessment demo without authentication.
- The mock stores attempt history in memory; restarting it resets test-attempt counters.
- Deployment, notifications, queues, and login are outside the assignment scope.

## Time Spent

Record your actual total time spent on implementation, testing, troubleshooting, and documentation before submitting. Also document time lost because the original assignment attachment was missing.

## AI Tool Disclosure

AI assistance was used to help with implementation guidance, debugging, frontend/backend integration, and documentation. The application was manually run and verified against the listed checks. Review this disclosure and adjust it to accurately describe the tools used and your own contribution.

## Submission Checklist

- [ ] Source code and dependency manifests included
- [ ] Lockfiles included where applicable
- [ ] `.env.example` included without secrets
- [ ] Database initialization documented
- [ ] Architecture/process diagram added
- [ ] API request and response examples reviewed
- [ ] Verification results reviewed
- [ ] Actual time spent and limitations recorded
- [ ] AI-tool disclosure checked
- [ ] Repository checked for secrets before submission
