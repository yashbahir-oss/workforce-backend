# WORKFORCE backend — requested fixes (2026-09-28)

- Added admin role-change API: `PATCH /api/admin/users/:id/role`.
- Customer -> Worker requires multipart Aadhaar/ID, camera selfie and `experienceYears`; role becomes worker with verification status pending.
- Worker -> Customer role change is supported.
- Role changes are audited and the worker receives a verification notification.
- Booking population now includes customer/worker profile-image fields so worker booking cards can show the actual customer.
- WorkGuide matching now understands category -> skill vocabulary from MongoDB and returns verified workers matching the requested category/skills rather than relying only on literal text.
- Existing R2/private-storage and Socket.IO services are reused.
- Existing `/api/messages` attachment flow remains private and protected.
