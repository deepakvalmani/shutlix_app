# Security Audit Report: ShutliX v2 Backend

This report details the security hardening and logic auditing performed on the Express/MongoDB backend to ensure production readiness.

## 1. Authentication & Authorization (The "Master Gate")
*   **Status**: Hardened ✅
*   **Logic**: 
    *   JWT-based stateless authentication.
    *   Role-based access control (RBAC) via `restrictTo` middleware.
    *   **Organizational Isolation**: Every request is scoped to the `organizationId` found in the user document. Cross-org data leaks are prevented by strict filter checks in controllers.

## 2. Real-Time Logic (Socket & Redis)
*   **Status**: Hardened ✅
*   **Audit Points**:
    *   **Socket Authentication**: Custom middleware ensures only authenticated users can connect.
    *   **Room Isolation**: Users are automatically joined to `org:{id}` rooms, preventing cross-organization broadcasts.
    *   **Anti-Ghosting**: Driver locations in Redis use a 30s TTL. This ensures that even if a driver's phone dies without sending an `endTrip` event, they disappear from the map after 30 seconds.

## 3. Data Integrity & Validation
*   **Status**: Hardened ✅
*   **Implementation**:
    *   Used Mongoose schemas with strictly typed fields.
    *   Implemented `express-rate-limit` to prevent brute-force attacks on sensitive endpoints (`/api/auth/login`, `/api/auth/send-otp`).
    *   Disabled `contentSecurityPolicy` temporarily for dev-mode Vite, but enabled basic `helmet` security headers.

## 4. Trip Lifecycle Audit
*   **Status**: Logic Secure ✅
*   **Invariant**: A driver cannot have two simultaneous active trips.
*   **Verification**: `startTrip` controller checks for existing active trips before creation.
*   **QR Check-in**: Secondary verification ensures students can only check-in to shuttles within their own organization.

## 5. Deployment Safety
*   **Configuration**: All secrets moved to environment variables.
*   **Error Handling**: Global error handler prevents internal stack traces from leaking to the client in production.
