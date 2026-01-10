# OAuth 2.0 Identity Provider (Internal Architecture)

**NOTE:** This document covers the _internal implementation_ of the Identity Provider. For the public developer documentation, see [docs/developer](../developer/README.md).

## Architecture

Coach Watts acts as an OAuth 2.0 IdP using custom API endpoints backed by Prisma.

### Data Models

- **OAuthApp:** Stores client credentials and configuration.
- **OAuthConsent:** Tracks user approvals for specific apps/scopes.
- **OAuthToken:** Stores Access and Refresh tokens.
- **OAuthAuthCode:** Short-lived codes for the PKCE flow.

### Key Components

- **Repository:** `server/utils/repositories/oauthRepository.ts` handles all DB operations and token generation.
- **Auth Guard:** `server/utils/auth-guard.ts` verifies Bearer tokens and scopes.
- **Endpoints:** `server/api/oauth/*` handles the protocol flow.

### Audit Logging

All OAuth actions (creation, authorization, revocation) are logged to the `AuditLog` table using `server/utils/audit.ts`.
