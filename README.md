# WORKFORCE Backend

Production-oriented reusable backend for the WORKFORCE web/mobile/admin applications.

## Stack
- Node.js + Express.js (JavaScript)
- MongoDB Atlas + Mongoose
- JWT access token + HTTP-only refresh token
- RBAC: customer, worker, admin
- Socket.IO realtime messaging/notifications
- Cloudflare R2 for private worker documents when R2 credentials are configured
- Local private storage fallback for development only
- OpenRouter WorkGuide integration with database-grounded worker/job context
- Helmet, CORS, rate limiting, Pino logging
- REST API with `/api/v1` and backward-compatible `/api` routes

## Core rules
- Worker public search returns only `verificationStatus=approved` workers.
- Worker mobile/contact details are not exposed by public worker profile APIs.
- Worker verification is document-driven and admin-controlled.
- Worker profile has no public rate field; booking/payment amount is intentionally deferred.
- Customer and worker can chat through MongoDB + Socket.IO.
- Reviews are allowed only after a completed booking.
- Categories, skills and locations are dynamic MongoDB data.
- Payment gateway is not implemented yet.
- OTP is development-first: OTP is logged and returned as `devOtp` outside production. In production, integrate an SMS provider through `sendSms()`.

## Setup
1. Copy `.env.example` to `.env`.
2. Fill MongoDB Atlas and JWT secrets. Never commit `.env`.
3. Fill Cloudflare R2 credentials for private document storage.
4. Fill `OPENROUTER_API_KEY` for WorkGuide. Without it, WorkGuide uses a safe local fallback and DB results.
5. Run `npm install`.
6. Run `npm run check` then `npm run dev`.

## Important endpoints
- `POST /api/v1/auth/register/request-otp`
- `POST /api/v1/auth/register/verify-otp`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/workers/search`
- `GET /api/v1/workers/:id`
- `PATCH /api/v1/workers/me`
- `POST /api/v1/workers/me/documents`
- `GET /api/v1/jobs`
- `POST /api/v1/jobs`
- `POST /api/v1/jobs/:id/apply`
- `POST /api/v1/bookings`
- `PATCH /api/v1/bookings/:id/status`
- `GET /api/v1/messages/conversations`
- `GET /api/v1/messages/:userId`
- `POST /api/v1/messages/:userId`
- `GET /api/v1/notifications`
- `POST /api/v1/reviews`
- `POST /api/v1/ai`
- `GET /api/v1/catalog/categories`
- `GET /api/v1/catalog/locations`
- `GET /api/v1/admin/dashboard/stats`
- `GET /api/v1/admin/verification`
- `PATCH /api/v1/admin/verification/:id`

## Worker lifecycle
Register → upload verification documents → pending → admin review → approved/rejected → approved workers become searchable → jobs/applications/bookings → completed work → customer review.

## Notes
The backend is focused on WORKFORCE marketplace flows: customer requirements, worker verification, applications, bookings, messaging, WorkGuide and admin operations.
