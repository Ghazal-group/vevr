# VEVR · Business finance, brought together

A responsive Nigerian business-finance workspace with a connected React frontend, Express API and PostgreSQL-compatible storage. **Every business starts empty.** No demo login, seeded balances, fabricated chart series, live bank claims, or automatic lending decisions.

## Quick start

Use Node 20.19+ or 22.12+. Run `npm ci` and `npm run dev`, open the preview on port 3000, then choose **Create an account**. Vite and the API are served on the same origin. For local use, PGlite persists a PostgreSQL-compatible database in `data/`. Never share a live PGlite directory between processes. Use managed PostgreSQL for deployed business data.

## A first real workflow

1. Create a business and add a product with its purchase cost, selling price and initial quantity.
2. Add a customer and register a bookkeeping account under Banking & Payments.
3. Open Point of Sale, select products, adjust quantities, optionally apply a discount, choose the customer/account and confirm a payment that has actually been received.
4. Download the receipt. Check stock movements, the transaction ledger, cash-flow totals and the financial report. Reverse an incorrect sale with a reason; its stock returns and its record remains in the audit trail.
5. Try a quote, convert it to an invoice, and record payment. Catalogue products reduce stock **when payment is recorded**, not when a quote is created. Service lines do not affect inventory. Invoices currently support full settlement only.

## What works

- Branded welcome slideshow, responsive navigation, account creation, business details, login/logout, password recovery integration, profile editing, multiple owner-operated business accounts.
- Overview with date filters, prior-period comparisons, sales/expense/profit and cash-flow charts, daily/weekly/monthly bucketing, quick capture and recent activity.
- Catalogue, SKUs, categories, cost, price, low-stock thresholds/notifications, product images, adjustment history and stock valuation.
- POS checkout, discounts, payment-method tracking, transactional stock checks, receipts, cancellation/reversal and restoration. No payment is actually charged.
- Sales, categorised expenses, receipt images, audited expense corrections and reversals. Corrections retain an audit note; financial rows are not hard-deleted.
- Customer contacts, purchase history, spend and outstanding invoices; itemised invoices and quotations, configurable document tax, overdue states, payment recording, PDF export.
- Manual cash/bank accounts, opening balances, inflow/outflow entries, reconciliation and account activity. No live bank feed or transfer execution.
- Seven report types with CSV export. Inventory is a current snapshot, not historical stock valuation. Other period-based reports use recorded transaction dates.
- Tax Centre: explicit paid-invoice tax plus configured percentage estimates on sales explicitly marked taxable, less recorded tax payments. A business rate change applies to future entries only. These are **not** verified Nigerian tax obligations, tax returns, VAT determinations or full income-tax calculations.
- Financial Health: growth comparisons, margins, expense ratios, cash flow, unpaid balances, inventory alerts, private lender-file preparation, PDF business summaries and manual external application tracking. Business records are self-reported: **no bureau score, underwriting decision, lender submission or loan disbursement**.
- VEVR Assistant: authenticated business aggregates, clearly labelled local insights without an API key, optional model-backed answers. Rule-based typed/voice capture prepares a draft for confirmation. Try `Spent ₦800 on delivery`, `Sold 2 notebooks` (saved product: Notebook), or `Restock 5 units of Notebook`. Browser availability, microphone permission, and the browser's speech service determine dictation support.

## Data and accounting

Balances are in integer **kobo**; the only supported ledger currency is NGN. Sales and expenses follow recorded/received transactions rather than accrual recognition. Operating profit is recorded sales revenue (excluding explicit invoice tax) less product costs captured at sale and recorded expenses. Inventory replenishment does not automatically post a bank outflow; record its cash impact separately, avoiding double-counting cost of goods sold as an operating expense. Unpaid invoices are tracked separately. Manual account movements affect cash flow, not revenue. Review these conventions with your accountant.

SQL migrations in `migrations/` apply idempotently on startup or via `npm run migrate`. `npm run seed` initialises the schema **without inserting business data**. On PostgreSQL, the configured database must already exist and the service user needs the appropriate migration permissions. Rehearse migrations against backups before deployment. Do not run migration commands against a PGlite directory in use by another process.

## Configuration & deployment

Use environment variables / Replit Secrets (not client-side `VITE_` variables). See `.env.example`. For local shell configuration export the variables before starting; `.env` files are not automatically loaded by the API.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URI. Use verified TLS as required by your managed provider. If omitted, embedded PGlite is used. |
| `PORT`, `PGLITE_DIR` | HTTP port (default 3000) and optional local database directory. |
| `AI_API_KEY`, `AI_ENDPOINT`, `AI_MODEL` | Optional OpenAI-compatible chat completion endpoint. Configure a trusted provider only; the question and aggregate business figures may be sent to it. |
| `APP_URL`, `MAIL_FROM`, `RESEND_API_KEY` | Public HTTPS origin, verified sender and Resend key for password recovery. Without these, the UI explicitly reports unavailable email delivery. |

**Replit:** import the sources, set Secrets, choose Run for development. For deployment use `npm ci && npm run build` and `npm start`; `.replit` maps port 3000 to the public preview. Set a durable external `DATABASE_URL` before storing real financial records. Production cookies require HTTPS and are HTTP-only and partitioned for the embedded preview. Replit hosting, email delivery, model calls and external database provisioning require your own accounts; they are not provisioned by this repository.

**Elsewhere:** build the static assets, run the Node process behind HTTPS, and provide durable PostgreSQL. Keep a single application origin. Do not expose the Vite development server publicly as a production service.

## Architecture

- `src/main.tsx`, `src/Recovery.tsx`: brand experience, auth, routing, capture. Official logo assets extracted from supplied references.
- `src/Workspace.tsx`, `src/Modules.tsx`, `src/Editor.tsx`, `src/Analytics.tsx`: authenticated views and shared forms; TanStack Query, React Router, Recharts, Tailwind utilities, local shadcn-style button, Framer Motion and Lucide.
- `server.ts`: HTTP/API boot, sessions, owner access checks, PostgreSQL/PGlite adapters and migrations.
- `backend/operations.ts`: schema validation and transactional business mutations. Each operation locks its business row, checks related object ownership, updates financial/inventory records, and records an audit event. Optional UUID request keys prevent repeat financial postings on retry.
- `backend/insights.ts`, `backend/media.ts`, `backend/schema.ts`: structured financial queries, assistant service, tenant-private image routes and Drizzle schema. Financial writes use explicit parameterised SQL transactions; Drizzle is used for typed lender-file reads.
- `/api/b/:id/state` returns the authorised small-business workspace snapshot. `/api/b/:id/records` also supports server-side `page`, `limit`, `kind`, `search`, `from` and `to` filters. Main workspace tables paginate locally; very large ledgers should migrate to paged, aggregated views before high-volume deployment.
- Financial tables model payments/transactions in `ledger`, checkout lines in `lineitems`, document line snapshots in `docs.lines`, and stock events in `movements`. Notifications are derived from current stock and overdue documents. Memberships currently support owner access, not staff invitation workflows.

## Verification

```sh
npm run check
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
```

API and browser tests start isolated temporary databases and delete them afterwards. They never seed your business. Coverage includes isolation, auth, stock rollback/restoration, discounts, cost and tax handling, idempotency, corrections, quote conversion, invoice payment, reconciliation, private media, local insights, funding files, mobile navigation and core browser flows. Optional provider integrations require separate staging tests with your credentials.

## Before a public financial launch

This is a working bookkeeping application, not a regulated bank. Arrange an independent security/privacy review, backups and restore drills, monitoring, load testing, production email checks, and professional review of accounting/tax rules. Validate any future credit model and obtain appropriate authorisations and provider agreements before enabling lending or money movement. Speech service and optional model-provider use should be disclosed in your privacy notices. Verify uploads, retention/deletion policy and business continuity controls against your deployment requirements.

## Interface update

The workspace now uses horizontal navigation on desktop and a compact mobile directory. See `DESIGN-REVIEW.md` for the redesign, unchanged backend boundary, test coverage and remaining deployment checks. To reproduce the extended Chromium verification after building, run `node tests/browser.mjs --polish`. This release includes a compiled `dist/` for convenience; `npm run build` regenerates it from source.
