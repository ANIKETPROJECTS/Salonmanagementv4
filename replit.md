# Salon Management System

## Overview
A full-stack Salon Management System with a React frontend and Express/MongoDB backend. Includes 10 pages: Dashboard, Appointments, Customers, POS (billing), Services, Staff, Products (inventory), Expenses, Memberships, and Reports.

## Architecture

### Monorepo Structure (pnpm workspaces)
- `artifacts/salon-app/` — React + Vite frontend (port 5173, preview path `/`)
- `artifacts/api-server/` — Express API server (port 8080, path `/api`)
- `lib/api-spec/` — OpenAPI specification (source of truth for API)
- `lib/api-client-react/` — Generated React Query hooks from OpenAPI spec

### Frontend (salon-app)
- React 18 + Vite + TypeScript
- Tailwind CSS with violet/purple primary, rose/pink secondary color scheme
- Playfair Display (serif) + Inter (sans) fonts
- Wouter for client-side routing
- TanStack React Query for data fetching
- Recharts for data visualization
- shadcn/ui components
- Pages: Dashboard, Appointments, Customers, POS, Services, Staff, Products, Expenses, Memberships, Reports

### Backend (api-server)
- Express + TypeScript
- MongoDB via Mongoose (connection via `MONGODB_URI` secret)
- date-fns for date formatting
- All routes mounted at `/api/*`
- Models: Customer, Staff, Service, Product, Appointment, Bill, Expense, Membership

### API Client Generation
- OpenAPI spec at `lib/api-spec/openapi.yaml`
- Generated hooks in `lib/api-client-react/src/generated/`
- Run codegen: `pnpm --filter @workspace/api-client-react run codegen`

## Key Files
- `artifacts/api-server/src/app.ts` — Express app + MongoDB connection
- `artifacts/api-server/src/routes/index.ts` — Route mounting
- `artifacts/api-server/src/models/index.ts` — Mongoose models
- `artifacts/api-server/src/lib/mongodb.ts` — MongoDB connection utility
- `artifacts/salon-app/src/App.tsx` — React router + providers
- `artifacts/salon-app/src/components/layout.tsx` — Sidebar navigation
- `artifacts/salon-app/src/pages/` — All 10 page components

## Invoice Module
- `/invoices` page: lists all bills as invoices with filters (search, date range, payment method)
- Each row shows Invoice #, customer, contact, date, payment method, amount, status + View button
- View button opens full invoice modal with salon branding header (AT SALON, address, contact, GSTIN)
- Invoice shows: customer info, itemized services/products table, totals breakdown, payment badge
- "Download / Print" button in modal opens print dialog → save as PDF
- Customers page: each bill in visit history now has a "View Invoice" button linking to the same modal
- Backend: GET /api/bills now supports `from`, `to`, `paymentMethod`, `customerId` query filters
- Backend: GET /api/bills/:billId returns a single bill by ID

## Seeded Data
- 7 services (Hair Cut, Keratin, Gold Facial, Body Massage, Bridal Makeup, Nail Art, Hair Color)
- 4 staff members (Priya Sharma, Kavya Nair, Anjali Desai, Sneha Rao)
- 3 customers (Meena Krishnan, Pooja Verma, Rekha Joshi)
- 3 products (LOreal Keratin Serum, Wella Hair Color, OPI Nail Polish)
- 3 membership plans (Silver ₹1500/3mo, Gold ₹3000/6mo, Platinum ₹6000/12mo)

## Secrets
- `MONGODB_URI` — MongoDB connection string
- `SESSION_SECRET` — Session secret (configured)

## Development
- API server auto-builds and starts on workflow start
- Frontend Vite dev server hot-reloads on changes
- No proxy needed — Replit routes `/api/*` to port 8080 and `/` to port 22910
