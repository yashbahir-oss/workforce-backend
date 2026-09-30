# WORKFORCE backend final changes

- Worker registration accepts only `image`, `idDocument`, and optional `experienceDocument` upload fields.
- Worker selfie and Aadhaar/ID remain mandatory; experience certificate remains optional.
- Uploaded worker verification files are stored through the existing private storage abstraction (Cloudflare R2 when configured, local private storage otherwise) and are linked to the worker's VerificationDocument records.
- Admin verification can retrieve a submitted document through `/api/admin/verification/:id/file` with admin authorization.
- `.env.example` uses PORT=5000 to match the local WORKFORCE frontend setup.
