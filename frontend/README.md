# Sankat Saathi frontend

A polished flood-relief coordination dashboard built with React, Vite, and Tailwind CSS. It includes:

- command overview and live operational indicators;
- priority relief requests;
- inventory health;
- AI allocation recommendations; and
- delivery tracking.

## Run locally

```bash
npm install
npm run dev
```

Open the address shown in the terminal (usually `http://localhost:5173`). To create a deployable build:

```bash
npm run build
```

## Connecting FastAPI

All temporary data is intentionally isolated in `src/services/reliefApi.js`. Replace the body of `getDashboardData()` with your API request:

```js
export async function getDashboardData() {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard`)
  if (!response.ok) throw new Error('Unable to load dashboard data')
  return response.json()
}
```

Create `.env.local` for your local backend URL (do not commit it):

```
VITE_API_URL=http://localhost:8000
```

The dashboard currently expects a `stats`, `requests`, `inventory`, `deliveries`, and `allocations` payload. Keep the fields in the mock data module as a lightweight contract until the FastAPI endpoints are finalized.
