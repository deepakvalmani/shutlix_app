# ShutliX

ShutliX is a full-stack shuttle management platform built with React, Vite, Express, TypeScript, MongoDB, Redis, and Socket.IO.

It includes:
- real-time vehicle tracking and route management
- authenticated user, driver, admin, and superadmin flows
- chat, notifications, billing, and lost-and-found features
- a Vite-powered frontend and an Express/TypeScript backend

## Features

- User authentication and role-based access controls
- Organization, route, driver, student, and booking management
- Real-time tracking with Socket.IO
- Notifications and email integration
- Payment billing via Stripe
- Admin and analytics dashboards
- Push notifications and VAPID support

## Quick Start

### Prerequisites

- Node.js 20+ (or compatible)
- MongoDB instance
- Redis instance
- Optional: Stripe account, Cloudinary account, Gmail API credentials for email

### Install Dependencies

```bash
npm install
```

### Configure Environment

Copy the example env file and update it with your values:

```bash
cp .env.example .env
```

Then update `.env` with your database, Redis, JWT, email, Cloudinary, Stripe, and VAPID settings.

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Build

```bash
npm run build
```

## Available Scripts

- `npm run dev` – start the development server with Vite middleware
- `npm run start` – run the production server
- `npm run build` – build the frontend for production
- `npm run preview` – preview the built production app
- `npm run clean` – remove generated `dist` output
- `npm run lint` – run TypeScript checks

## Environment Variables

The root `.env.example` includes these settings:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI="mongodb://user:pass@host:port/db"
REDIS_URL="redis://user:pass@host:port"
JWT_SECRET="your-access-token-secret"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRE="15m"
JWT_REFRESH_EXPIRE="7d"
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_DURATION_MINUTES=15
CLIENT_URL="http://localhost:3000"
GMAIL_USER="your-email@gmail.com"
GMAIL_CLIENT_ID="your-client-id"
GMAIL_CLIENT_SECRET="your-client-secret"
GMAIL_REFRESH_TOKEN="your-refresh-token"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_EMAIL="admin@shuttlix.com"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
VITE_VAPID_PUBLIC_KEY="your-vapid-public-key"
```

## Project Structure

- `server.ts` – main Express + Vite entry point
- `server/` – backend modules, routes, models, services, and utilities
- `src/` – React application pages, components, hooks, services, and state stores
- `public/` – PWA assets, manifest, offline page, service worker
- `api/` – additional API routes and helpers
- `backend/`, `frontend/` – legacy or separate app directories included in the workspace

## Notes

- This app uses Vite middleware in development and serves static `dist` files in production.
- Make sure Redis and MongoDB are available before starting the server.
- For production deployment, configure `NODE_ENV=production` and set all required secrets.
