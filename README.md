# Expense Tracker Fullstack

A **full‑stack expense tracker** built with **Next.js** for the frontend, **Express** (Node.js) for the backend API, and **Prisma** as the ORM for a SQLite/PostgreSQL database. The application lets users add, view, and manage their financial transactions in a clean dashboard.

---

## Table of Contents
- [Demo](#demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend (Express)](#backend-express)
  - [Frontend (Next.js)](#frontend-nextjs)
- [Running the Project](#running-the-project)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [License](#license)

---

## Demo
> _A live demo can be hosted on Vercel (frontend) and Railway (backend) – replace the URLs below with your deployed instances._

- Frontend: https://your-frontend-url.vercel.app
- Backend: https://your-backend-url.vercel.app/api/v1

---

## Features
- **User‑friendly dashboard** showing total balance, income, and expense breakdowns.
- **Add / Edit / Delete transactions** with instant UI updates via React Query.
- **Responsive design** – works on mobile, tablet, and desktop.
- **Server‑side validation** using Express middleware.
- **Database migrations** managed by Prisma.
- **CORS configuration** to enable smooth communication between the frontend and backend.
- **Comprehensive API** (REST) with Swagger‑like documentation.

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js (React 18), TypeScript, Tailwind CSS, @tanstack/react-query |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | SQLite (development) / PostgreSQL (production) |
| tooling | ESLint, Prettier, Jest (unit tests), Supertest (API tests) |

---

## Prerequisites
- **Node.js** >= 18.x
- **npm** or **yarn** (the scripts use npm syntax)
- **Git**
- **Docker** (optional – for running a PostgreSQL container locally)

---

## Installation
Below are the steps to get the project running locally.

### Backend (Express)
```bash
# Clone the repository (if you haven't already)
git clone <repo-url>
cd pocket-mint/backend

# Install dependencies
npm install

# Create a .env file (copy from the example)
cp .env.example .env
# Edit .env as needed – at minimum set DATABASE_URL
```
> **Tip:** For development the default `DATABASE_URL` points to a SQLite file `dev.db`. To use PostgreSQL, set a DSN like `postgresql://user:pass@localhost:5432/expense_tracker`.

```bash
# Run Prisma migrations (creates tables)
npx prisma migrate dev --name init

# Seed the database (optional)
npx prisma db seed

# Start the server
npm run dev   # server runs at http://localhost:5000
```

### Frontend (Next.js)
```bash
cd ../frontend/expense-tracker-fullstack

# Install dependencies
npm install

# Run the dev server
npm run dev   # frontend runs at http://localhost:3000
```

---

## Running the Project
1. **Start the backend** (`http://localhost:5000`).
2. **Start the frontend** (`http://localhost:3000`).
3. Open the browser at `http://localhost:3000` – the dashboard will fetch data from the backend automatically.

---

## API Documentation
All endpoints are served under the base path **/api/v1**.

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| **GET** | `/api/v1/transactions` | Retrieve a list of all transactions (sorted newest first). | – | `[{ id, description, amount, date, createdAt, updatedAt }, …]` |
| **POST** | `/api/v1/transactions` | Create a new transaction. | `{ description: string, amount: number, date: string (ISO) }` | `{ id, description, amount, date, createdAt, updatedAt }` |
| **PUT** | `/api/v1/transactions/:id` | Update an existing transaction. | `{ description?, amount?, date? }` | Updated transaction object |
| **DELETE** | `/api/v1/transactions/:id` | Delete a transaction by its ID. | – | `{ success: true }` |
| **GET** | `/api/v1/transactions/:id` | Retrieve a single transaction. | – | Transaction object |

### Example: Fetch Transactions (client side)
```ts
const fetchTransactions = async () => {
  const res = await fetch('http://localhost:5000/api/v1/transactions');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};
```

### CORS
The backend includes the **cors** middleware configured to allow requests from `http://localhost:3000` (frontend dev server). If you change the frontend port or deploy to another host, update the `origin` value in `backend/src/app.ts`.

---

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the Express server | `5000` |
| `DATABASE_URL` | Prisma connection string | `file:./dev.db` (SQLite) |
| `FRONTEND_URL` | Allowed origin for CORS | `http://localhost:3000` |

---

## Testing
### Backend
```bash
cd backend
npm run test   # runs Jest + Supertest suite
```
### Frontend
```bash
cd frontend/expense-tracker-fullstack
npm run test   # runs React Testing Library tests
```

---

## Project Structure
```
├─ backend/                     # Express API
│  ├─ src/                     # Source code
│  │  ├─ routes/               # Route definitions
│  │  ├─ controllers/          # Request handlers
│  │  ├─ middleware/           # CORS, validation, etc.
│  │  └─ app.ts                # Express app bootstrap
│  ├─ prisma/                  # Prisma schema & migrations
│  ├─ package.json
│  └─ tsconfig.json
│
├─ frontend/expense-tracker-fullstack/   # Next.js app
│  ├─ pages/                  # Next.js pages (dashboard, add form)
│  ├─ components/             # Re‑usable UI components
│  ├─ hooks/                  # React Query wrappers
│  ├─ styles/                 # Tailwind config
│  ├─ tsconfig.json
│  └─ package.json
│
├─ docs/rfc.md                 # Design and RFC notes
└─ README.md                   # *This file*
```

---

## License
Distributed under the **MIT License**. See `LICENSE` for more information.

---

> **Happy coding!** If you encounter any issues, please open a GitHub issue or reach out via the project’s discussion board.
