# MiniLedger

MiniLedger is a full-stack personal loan tracker built for a Full Stack Development internship assignment. It helps people keep a clear record of money they lend to friends, when repayment is due, and what has already been repaid.

## Problem statement

Informal loans between friends can be difficult to remember and track. MiniLedger provides an authenticated ledger for recording loans, checking due dates, marking repayments, and reviewing totals. It uses a mock phone OTP for authentication; it does not send SMS or transfer money.

## Features

- Phone-number login using a mock one-time password (OTP). The backend prints the OTP in its terminal; it is not returned to or displayed by the app.
- Add loans with a friend's name, amount, and due date.
- List the authenticated user's loans.
- Mark pending loans as repaid.
- View total lent, total repaid, and overdue outstanding amount.
- Highlight overdue loans in the dashboard.
- Refresh the dashboard after loan creation and repayment.

## Technology stack

- **Backend:** Node.js, TypeScript, Express, PostgreSQL
- **Frontend:** React Native, Expo, TypeScript, React Native Web
- **Backend validation and authentication:** Zod, bcryptjs, JSON Web Tokens

## Project structure

```text
backend/
  sql/schema.sql          PostgreSQL table definitions
  src/
    routes/auth.ts        OTP request and verification
    routes/loans.ts       Authenticated loan endpoints and summary
    config.ts             Environment validation
    db.ts                 PostgreSQL connection pool
    index.ts              Express app and health endpoint
    init-db.ts             Non-destructive schema initialization
    middleware.ts          Authentication and error handling
  package.json
  .env.example

mobile/
  App.tsx                  Session restoration and screen selection
  index.ts                 Expo entry point
  src/
    api.ts                 Backend API client
    LoginScreen.tsx        Phone and OTP login
    LoansScreen.tsx        Dashboard and loan management
  app.json
  package.json
  .env.example

mobile-src/                Retained source copy; the runnable app is mobile/
README.md
```

## Prerequisites

- Node.js and npm
- PostgreSQL 14 or newer, running and reachable by the backend
- A web browser for Expo Web, or Expo Go / an emulator for native use

## Setup

Run these commands from the project root in PowerShell.

### 1. Configure PostgreSQL

Start the PostgreSQL service installed on your machine. The service name varies by installation; inspect it before starting it:

```powershell
Get-Service *postgres*
Start-Service <installed-postgresql-service-name>
```

Create a database and login role if they do not already exist. Connect as a PostgreSQL administrator and run SQL appropriate to your installation:

```sql
CREATE ROLE miniledger_app LOGIN PASSWORD '<choose-a-local-database-password>';
CREATE DATABASE miniledger OWNER miniledger_app;
```

If the role or database already exists, do not recreate or delete it; use the existing objects and verify their permissions. The schema initializer only creates missing tables and index and does not drop tables or records.

### 2. Configure and start the backend

```powershell
Set-Location .\backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `backend/.env` with local values. Use a PostgreSQL connection URL for the role and database you configured. Set `JWT_SECRET` to a random value of at least 32 characters. For example, generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then install dependencies, initialize the schema, and run the API:

```powershell
npm install
npm run db:init
npm run dev
```

The development API listens on port `4000` by default. Its health endpoint is `http://localhost:4000/health`; it checks PostgreSQL connectivity as well as API availability.

For a compiled backend:

```powershell
npm run build
npm start
```

### 3. Configure and start the Expo frontend

In a separate terminal:

```powershell
Set-Location .\mobile
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run web -- --port 8081
```

Open the URL printed by Expo (normally `http://localhost:8081`) in a browser. For native use, run `npm start` and open the project with Expo Go or an emulator.

Set the API URL in `mobile/.env` for the runtime target, then restart Expo after changing it:

```dotenv
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000

# Browser on the same computer
EXPO_PUBLIC_API_URL_WEB=http://localhost:4000
```

For an iOS simulator, use `http://localhost:4000` for `EXPO_PUBLIC_API_URL`. For a physical phone, set `EXPO_PUBLIC_API_URL` to `http://<computer-LAN-IP>:4000`; the phone and computer must be able to reach each other, and the computer firewall must allow the backend port. Environment files are local configuration and must not be committed.

## Environment variables

| Variable | Used by | Purpose | Example / requirement |
|---|---|---|---|
| `PORT` | Backend | Express listening port | `4000` |
| `DATABASE_URL` | Backend | PostgreSQL connection URL | `postgresql://<user>:<password>@<host>:5432/<database>` |
| `JWT_SECRET` | Backend | Signs authentication tokens | Use a private random string, at least 32 characters |
| `EXPO_PUBLIC_API_URL` | Expo native | Backend URL for Android/iOS | Emulator: `http://10.0.2.2:4000`; device: `http://<computer-LAN-IP>:4000` |
| `EXPO_PUBLIC_API_URL_WEB` | Expo Web | Backend URL for browser use | `http://localhost:4000` on the same computer |

The `.env.example` files contain placeholders/default development addresses only. Never put real passwords, signing secrets, or private credentials in a committed example or source file.

## API

All routes are relative to `http://localhost:4000`. JSON request bodies use `Content-Type: application/json`. The `/loans` routes require `Authorization: Bearer <JWT>` obtained from successful OTP verification.

### Health

| Method | Path | Authentication | Behavior |
|---|---|---|---|
| `GET` | `/health` | None | Returns `{ "ok": true, "database": "connected" }` when PostgreSQL is reachable; otherwise the request fails. |

### Authentication

| Method | Path | Body | Behavior |
|---|---|---|---|
| `POST` | `/auth/request-otp` | `{ "phone": "9876543210" }` | Validates a 10–15 digit phone number, generates a mock OTP, stores its bcrypt hash, and logs the code in the backend terminal. Responds with a message, not the code. |
| `POST` | `/auth/verify-otp` | `{ "phone": "9876543210", "otp": "<six-digit-code>" }` | Verifies the unexpired OTP and returns `{ "token": "<JWT>" }` on success. |

OTP codes expire after five minutes, allow at most five verification attempts, and a new request for the same phone is subject to a 30-second cooldown.

### Loans

| Method | Path | Body | Authentication | Behavior |
|---|---|---|---|---|
| `GET` | `/loans` | None | Required | Returns the current user's `loans` and `summary` (`totalLent`, `totalRepaid`, `overdueAmount`). |
| `POST` | `/loans` | `{ "friendName": "Rahul", "amount": 2000, "dueDate": "2026-11-23" }` | Required | Creates a loan and returns the created loan. Amount must be positive and have at most two decimal places; date must be a valid `YYYY-MM-DD` date. |
| `PATCH` | `/loans/:id/repay` | None | Required | Marks the current user's pending loan as repaid. A repeated repayment returns a conflict response. |

Example authenticated request:

```powershell
$headers = @{ Authorization = "Bearer <JWT-from-verify-otp>" }
Invoke-RestMethod -Headers $headers -Uri http://localhost:4000/loans
```

There is no separate summary endpoint; the summary is included in `GET /loans`.

## Validation, errors, and data handling

- Request payloads are validated with Zod. Invalid request data is reported as HTTP 400.
- Loan SQL uses parameters and scopes reads/updates to the authenticated user's ID.
- Missing loans return HTTP 404; attempting to repay an already repaid loan returns HTTP 409.
- Missing/invalid authentication returns HTTP 401.
- OTP values are stored as bcrypt hashes and are single-use after successful verification.
- PostgreSQL is the persistent data store. The application does not use an in-memory loan store.

## Build and checks

Available package scripts:

```powershell
# Backend TypeScript build
Set-Location .\backend
npm run build

# Mobile TypeScript check (no package script is declared)
Set-Location ..\mobile
npx tsc --noEmit
```

The backend package does not declare a test or lint script. The mobile package does not declare test, lint, or build scripts; Expo provides the `start`, `android`, `ios`, and `web` scripts listed above.

## Deployment status and limitations

- **Deployment status:** No deployed application URL is configured in this repository. The local URLs above are development addresses.
- **Deployed application:** `<add-deployed-application-URL-or-write-not-deployed>`
- OTP delivery is mocked and appears only in the backend terminal; no SMS provider is configured.
- The app requires a reachable PostgreSQL database for health checks, login, and loan operations.
- No automated test suite or production deployment configuration is declared in the package scripts/configuration inspected for this README.
- No real payments or repayment processing are performed; marking repaid updates the loan record.

## Troubleshooting

- **`/health` returns an error:** Confirm PostgreSQL is running, that `DATABASE_URL` is correct, and that the configured role can connect to the database. Run `npm run db:init` from `backend/`.
- **OTP request fails:** Check backend terminal output and PostgreSQL connectivity. The OTP is printed in that terminal, not in the app.
- **OTP is rejected:** Check that it is the latest code for that phone, enter it before five minutes have elapsed, and request a new one after the cooldown if needed.
- **Browser cannot reach the API:** Confirm `EXPO_PUBLIC_API_URL_WEB=http://localhost:4000` in `mobile/.env`, that the backend is running, and that the browser is on the same computer. Restart Expo after editing `.env`.
- **Android emulator cannot reach the API:** Use `http://10.0.2.2:4000`, not emulator `localhost`.
- **Physical phone cannot reach the API:** Use the computer's LAN IP, the same reachable network, and allow the backend port through the firewall.
- **Schema initialization fails:** Verify the configured database and user exist and are accessible; the initializer does not create PostgreSQL roles or databases.

## Repository and demo

- **GitHub repository:** [satyam2428cs2299-create/miniledger](https://github.com/satyam2428cs2299-create/miniledger)
- **Demo video (2–3 minutes):** `<add-demo-video-link>`

## Assignment submission checklist

- [ ] Push the complete project (backend, runnable Expo app, SQL schema, and README) to the GitHub repository.
- [ ] Confirm `.env` files and secrets are not staged or committed.
- [ ] Confirm dependency lockfiles are included.
- [ ] Add a 2–3 minute demo video link above.
- [ ] Add a deployed application URL above, or explicitly state that the project is not deployed.
- [ ] Include a brief demonstration of OTP login, adding a loan, overdue highlighting, repayment, and updated totals.
- [ ] Verify the documented setup and API URLs for the intended demo environment.
