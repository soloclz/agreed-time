# Agreed-Time Security Implementation

This document outlines the specific security measures implemented in the Agreed-Time project, referencing the general principles found in the `knowledge/` base.

## 1. Access Control (Capability Tokens)
We use the **Capability URL** pattern to manage access without user accounts.

*   **Principles**: See [[knowledge/security/url-security-capability-tokens]].
*   **Implementation**:
    *   `public_token` (UUIDv4): Grants read access to event details and write access to *submit* availability.
    *   `organizer_token` (UUIDv4): Grants administrative access (close event, view organizer details).
    *   Tokens are generated using `uuid::Uuid::new_v4()` for high entropy.

## 2. Participant Identity & Anti-Spoofing
To prevent **Organizer Impersonation** and data overwriting vulnerabilities:

*   **Anti-Overwrite (Always Insert)**:
    *   The backend `submit_availability` handler **always inserts a new row** for every submission.
    *   **Result**: Even if a malicious user submits with the organizer's name, they create a *new* participant entry (imposter) rather than overwriting the organizer's data.
    *   See **ADR-008** in [[docs/architecture/decisions]].

*   **Secure Editing (Participant Tokens)**:
    *   To allow valid users to update their own availability without accounts, we issue a secret `participant_token` (UUID) upon initial submission.
    *   **Editing**: Updates are only allowed via the `PUT` endpoint if the correct `participant_token` is provided.
    *   **Storage**: This token is stored in the user's `localStorage`.
    *   See **ADR-009** in [[docs/architecture/decisions]].

## 3. Abuse Prevention

### 3.1 Rate Limiting
*   **Principles**: See [[knowledge/security/abuse-prevention-basics]].
*   **Implementation**:
    *   Backend Middleware (`backend/src/middleware.rs`) enforces a rate limit per IP address.
    *   Current Limit: **5 requests per minute** (Strict). *Note: Consider relaxing this for production.*

### 3.2 Input Validation
To prevent resource exhaustion and huge payloads:

*   **Frontend**:
    *   **Name**: `maxLength={50}`
    *   **Comment/Description**: `maxLength={500}`
    *   **Anti-Double-Submit**: UI locks the submit button (`isSubmitting`) to prevent accidental duplicate entries.
*   **Backend**:
    *   Basic validation ensures fields are not empty.
    *   Database text limits (implicitly) and payload size limits prevent massive abuse.

### 3.3 CORS
*   **Principles**: See [[knowledge/security/cors-allowed-origins]].
*   **Implementation**:
    *   Configured via `ALLOWED_ORIGINS` environment variable in `backend/src/config.rs`.
    *   Strictly enforced by `tower_http::cors::CorsLayer`.

## 4. Database Security
*   **SQL Injection**: Prevented by using `sqlx` parameterized queries (`sqlx::query!`) exclusively.
*   **Offline Verification**: CI uses `sqlx-data.json` (via `sqlx-essentials`) to verify type safety without a live DB.
