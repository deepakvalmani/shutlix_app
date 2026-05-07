# ShutliX Architecture

## Overview
ShutliX is an enterprise-grade SaaS platform built with a modern full-stack architecture focused on multi-tenancy, real-time tracking, and secure communications.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Zustand (State Management), Socket.io-client.
- **Backend**: Node.js (Express 5), TypeScript, MongoDB (Mongoose), Redis (Caching & Socket Adapter), Socket.io.
- **Security**: JWT (Access & Refresh Tokens), OTP verification, RBAC, Zod validation, Helmet, Rate Limiting.
- **Real-time**: Socket.io for live tracking and chat.
- **Payments**: Stripe integration for SaaS monetization.
- **Notifications**: Web Push API & Email.

## Modular Structure
The backend is organized into domain-driven modules:
- `/auth`: Authentication, OTP, JWT management.
- `/org`: Organization (tenant) management and settings.
- `/tracking`: Real-time fleet tracking and GPS history.
- `/students`: Student portal features, attendance (QR scan), and emergency SOS.
- `/drivers`: Driver portal features, trip management.
- `/chat`: Multi-tenant messaging system (1-to-1 and Groups).
- `/notifications`: Push notification subscriptions and management.
- `/analytics`: Usage metrics and performance reporting.
- `/billing`: SaaS plans and subscription management (Stripe).
- `/admin`: Enterprise control center for fleet and routes.

## Multi-Tenancy
Strict data isolation is enforced at the database and API level:
- Every document (except Super Admin resources) is associated with an `organizationId`.
- Middleware `validateOrg` ensures users only interact with data belonging to their tenant.
- Socket.io rooms are partitioned by `org:{id}`.

## Real-Time Engine
The system uses a high-performance tracking engine:
- Drivers emit GPS coordinates via WebSockets every few seconds.
- Redis stores the latest positions for fast retrieval.
- Geofencing logic triggers proximity alerts when shuttles approach stops.
