# Navarachna Designer Studio

Full-stack monorepo for the Navarachna Designer Studio admin dashboard, employee directory and companion mobile application.

## Tech stack

- **Web:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query.
- **API:** ASP.NET Core Web API on .NET 10, Entity Framework Core and Npgsql.
- **Database:** PostgreSQL.
- **Mobile:** Expo, React Native and Expo Router.
- **Infrastructure:** Docker and Azure deployment templates.

## Employee management

The authenticated Employee Management page is available at `/employees` in the web app.

Features:
- List employees from the API with server-side search, department filtering and pagination.
- Create and edit employee records.
- Deactivate employees (soft delete; records are retained).
- Export the current result page to CSV.
- Employee code generation and email uniqueness checks are handled by the API.
- PAN/Aadhaar values are not shown in full by the API. The web form intentionally does not submit masked values back to the server.

API routes (all require a valid bearer token):
- `GET /api/v1/employees?search=&department=&page=1&pageSize=10`
- `GET /api/v1/employees/{id}`
- `POST /api/v1/employees`
- `PUT /api/v1/employees/{id}`
- `DELETE /api/v1/employees/{id}` (soft delete)

## Run locally

### 1. Prerequisites

- Node.js version compatible with the Next.js version in `apps/web/package.json`
- .NET 10 SDK
- PostgreSQL instance and a database created for this application

### 2. Configure the API

Set secrets through .NET user-secrets or environment variables. Do not commit database passwords, storage connection strings or JWT signing keys.

From `apps/api/src/Navarachna.Api`:

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=navarachna;Username=postgres;Password=YOUR_LOCAL_PASSWORD"
dotnet user-secrets set "Jwt:Key" "REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_BYTES_LONG"
dotnet run
```

For environment-based configuration, use `ConnectionStrings__DefaultConnection` and `Jwt__Key`. The application intentionally fails at startup if either the database connection or a sufficiently long JWT key is missing.

Apply the existing EF Core migrations to your configured database before using employee endpoints:

```bash
dotnet ef database update
```

If the EF tool is not installed, install it with `dotnet tool install --global dotnet-ef`.

### 3. Run the web application

From `apps/web`:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, sign in with an account configured for the API, then open **Employee Management** from the sidebar.

By default, browser API requests use the same-origin `/api` and `/health` paths and Next.js rewrites them to the backend at `http://127.0.0.1:5207`. Set `INTERNAL_API_URL` for the Next.js server if your API runs elsewhere. Set `NEXT_PUBLIC_API_URL` only when you deliberately want the browser to call a separate API origin directly.

### 4. Important deployment notes

- Configure a real PostgreSQL connection string and a randomly generated JWT signing key via the hosting platform's secret store.
- Set `Cors:AllowedOrigins` to the exact trusted web/mobile origins. Do not use wildcard origins with credentialed requests.
- Configure Azure Blob Storage credentials in the environment when `Storage:Provider` is set to `Blob`; local storage is the development default.
- Run migrations as a controlled deployment step and verify the database backup before schema changes.
- The old appsettings file contained a database password and JWT key. Rotate those credentials if they were ever used outside a disposable development environment; removing them from the current file does not erase Git history.
- This repository's source code has not been built or run in this editing session; run the API and web checks in your environment before deploying.

## Repository layout

```text
apps/
  web/     Next.js admin dashboard
  api/     ASP.NET Core API
  mobile/  Expo companion app
docker/    Local and container configuration
infra/     Deployment templates
```
