# Kouci backend licensing

This implements the backend portion of the supplied startup/activation plan. The mobile application remains in its own repository. No builds, type checks, automated tests, security tests, migration execution, or database license creation were performed as part of this implementation.

## Implemented behavior

- PostgreSQL `licenses` and `activations` tables, enums, timestamps, positive-limit constraints, foreign key with cascading deletion, and a unique `(license_id, install_id_hash)` index. A baseline migration captures the pre-existing schema; a second migration adds licensing. Both include Drizzle snapshots for future schema generation.
- Cryptographically random activation codes: `KOUCI` followed by **seven groups of four** uppercase base32 characters (140 random bits). The four-group example in the original plan is too short to meet its 128-bit requirement. The mobile input must accept this longer format.
- Activation codes and installation UUIDs are stored only as domain-separated HMAC-SHA256 hashes. The activation code belongs to a license; its activations reference that license. Codes are never stored separately on activation records.
- Ed25519 signing and verification, with a versioned, deterministic JSON serialization contract. Secret generation writes a private key and an independent hashing secret to the ignored `.env.license` file with mode `0600`, refusing to overwrite it. The command outputs only the public key and file location.
- Public activation API, strict request validation, case/spacing/hyphen normalization, installation binding, plan entitlements, and explicit error codes.
- Atomic device-limit enforcement: registration locks the license row, checks status/expiration, reuses an existing installation or inserts one, then signs before commit. Failures roll back changes. Concurrent requests across API processes share the PostgreSQL lock. Retrying after a lost response does not consume another slot.
- Administrative commands to create, list, inspect, disable, enable, revoke, and reset licenses. Inspection includes activation IDs, count, timestamps, and app versions without exposing hashes. List supports pagination.
- An optional authenticated reset API for the future back office, supporting one installation or all installations on a license.
- Licensing routes have a 2 KiB request-body limit, 10 requests/minute/IP/route per API process, `Cache-Control: no-store`, sanitized errors, and HTTPS enforcement in production. Forwarded IP/protocol headers are trusted only for configured reverse proxies. Authorization and body fields are redacted from the application logger; licensing failures do not log underlying exceptions or database parameters.
- The server now honors the existing `HOST` setting and checks licensing secrets before listening.

## Plan defaults

| Plan | Players | Premium reports | Developer mode | Custom theme |
| --- | ---: | --- | --- | --- |
| BASIC | 15 | false | false | false |
| PRO | 18 | true | false | false |
| CUSTOM | 20 | false | true | true |
| MVP_TESTER | 18 | false | false | false |

All entitlements can be overridden during license creation. Every plan defaults to one installation and no expiration. CUSTOM premium reports default to false because the source specification does not define that entitlement. No player-creation or developer-action business logic exists in this backend yet: the signed entitlements are supplied for enforcement by the mobile application.

## Setup

Use Node.js 24 and the repository's installed dependencies. Run commands from the repository root.

1. Configure `DATABASE_URL` in `.env` using `.env.example` as the template. Do not overwrite an existing `.env`.
2. For a new backend installation, run `npm run license:keys` once. A development `.env.license` was already generated in this workspace during implementation, so keep that file and use `npm run license:public-key` to retrieve its public key. `.env`, `.env.*` (except the template), and the generated secret file are excluded from Git and Docker build context.
3. `.env` is loaded first, then `.env.license`; neither overrides variables already set in the process environment. Production should inject `LICENSE_SIGNING_PRIVATE_KEY` (base64 PKCS8 DER) and `LICENSE_CODE_HASH_SECRET` (base64 of 32 random bytes) through its secret configuration. Keep both backed up: replacing the hashing secret makes existing activation-code and installation hashes unusable; replacing the signing key requires a mobile public-key update.
4. On a **fresh development database**, apply the committed migrations with `npm run db:migrate`. These migrations have been generated, not applied. If a database already has `device`, `club`, `coach`, or `wishlist` tables without migration history, reconcile/baseline that existing schema before running migrations there; the initial migration creates those tables. Do not drop an existing database to resolve a baseline conflict.
5. Start the API with `npm run dev`. It refuses to start with missing or invalid licensing signing/hash configuration.

For production, terminate TLS at a reverse proxy, configure `TRUSTED_PROXIES` with that proxy's actual IP addresses/CIDRs, and have the proxy overwrite forwarded headers. Keep the API listener reachable only through that proxy. Licensing requests detected as plain HTTP receive `403 HTTPS_REQUIRED`; this repository does not provision certificates or deploy TLS. Rate limits use per-process memory; multi-instance deployments should additionally enforce a shared limit at the proxy.

Source `npm run license:*` commands use the development dependency `tsx`. In the production Docker image, use the compiled scripts instead, for example `node dist/scripts/license-admin.js list` or `node dist/scripts/license-admin.js reset-activation --id UUID`. No build was run for this change.

## HTTP contract and mobile integration

```http
POST /api/v1/licenses/activate
Content-Type: application/json
```

```json
{
  "activationCode": "KOUCI-0123-4567-89AB-CDEF-GHJK-MNPQ-RSTV",
  "installId": "17cc32aa-ccf3-46e7-b858-2747c1e1ac1b",
  "appVersion": "0.8.1"
}
```

The code above illustrates formatting only. Use the real code printed by `license:create`. Installation IDs must be UUIDs and are normalized to lowercase. App versions are 1–64 characters, begin with an ASCII letter/digit, and contain only letters, digits, `.`, `+`, `_`, or `-`. Additional request fields are rejected. Use the plural `/licenses` path from the TODO; the singular path in the introductory example is not registered.

Successful first activation and retries return HTTP 200:

```json
{
  "license": {
    "version": 1,
    "licenseId": "00000000-0000-4000-8000-000000000001",
    "club": "Vitória SC",
    "plan": "MVP_TESTER",
    "installId": "17cc32aa-ccf3-46e7-b858-2747c1e1ac1b",
    "maxPlayers": 18,
    "premiumReports": false,
    "developerMode": false,
    "customTheme": false,
    "issuedAt": 1787500000,
    "expiresAt": null
  },
  "signature": "<standard base64 of the 64-byte Ed25519 signature>"
}
```

**Signature protocol v1:** validate the exact required fields/types, sort all top-level license keys lexicographically, serialize as compact `JSON.stringify` JSON with no whitespace or trailing newline, encode UTF-8, and verify the detached signature using Ed25519. Fields are all scalar, so recursive key sorting is not needed. The exact key order is:

```text
club, customTheme, developerMode, expiresAt, installId, issuedAt,
licenseId, maxPlayers, plan, premiumReports, version
```

The public key is base64-encoded SPKI DER. A mobile crypto library expecting a raw 32-byte Ed25519 key needs SPKI decoding first. Embed the trusted public key in the mobile app; do not take a public key from an activation response as a trust source. The API never returns a private key or hashes. Backend `verifyLicense` validates the signature and payload schema; the verification CLI additionally checks the installation ID and expiration. The app must also do those checks, reject unsupported versions, and persist both the payload and signature in SecureStore. Preserve Unicode exactly, including the club name, during serialization.

`issuedAt` and non-null `expiresAt` use Unix seconds. Expiration is optional, but if configured the app must enforce it locally. The API checks expiration against the full database timestamp. `lastSeenAt` and `appVersion` are updated only on another activation request; there is no heartbeat, refresh requirement, or ongoing connection requirement.

Errors have the shape `{ "code": "DEVICE_LIMIT", "message": "..." }`:

| HTTP | Code | Meaning |
| ---: | --- | --- |
| 400 | INVALID_REQUEST | Invalid fields, malformed code format, or malformed JSON |
| 404 | INVALID_LICENSE | Correctly formatted but unknown code; unknown license ID for administration |
| 403 | LICENSE_DISABLED | License status is disabled |
| 403 | LICENSE_REVOKED | License status is revoked |
| 403 | LICENSE_EXPIRED | Expiration has passed |
| 409 | DEVICE_LIMIT | New installation would exceed the license limit |
| 413 | REQUEST_TOO_LARGE | Body exceeds 2 KiB |
| 415 | INVALID_REQUEST | Unsupported content type |
| 429 | RATE_LIMITED | Request limit exceeded; honor `Retry-After` |
| 403 | HTTPS_REQUIRED | Production licensing request did not arrive over trusted HTTPS |
| 401 | UNAUTHORIZED | Reset endpoint needs the administrator bearer token |
| 503 | ADMIN_UNAVAILABLE | HTTP reset has not been enabled with an admin token |
| 500 | SERVER_ERROR | Unexpected backend/database/signing failure |

Network errors/timeouts are handled by the mobile client; they are not API response codes.

## Manual feature checks (instructions only; not executed)

### 1. Migrations and setup

Follow the fresh-database setup above. Inspect the committed migrations or open `npm run db:studio` after applying them. Confirm `licenses` and `activations` and their fields/indexes/foreign key exist. Re-running `npm run db:migrate` should not reapply recorded migrations. No database migration was tested during implementation.

Retrieve the public key with `npm run license:public-key`. On a new installation, `license:keys` should create a mode-0600 secret file and print only the public key. Running it again should refuse to overwrite the existing file. Use one key set consistently for all API processes and administration commands.

### 2. Create licenses, defaults, and overrides

```bash
npm run license:create -- --club "Vitória SC" --plan MVP_TESTER --maxPlayers 18 --maxActivations 1 --premiumReports false --developerMode false
npm run license:list -- --limit 20 --offset 0
npm run license:get -- --id YOUR_LICENSE_UUID
```

Save the `activationCode` printed during creation and the license `id`. Listing and inspection must not return the activation code, code hash, or installation hashes. A new license has status ACTIVE, zero activations, and `expiresAt: null`. There is no recovery command for a lost activation code.

Create a license for each of BASIC, PRO, and CUSTOM without overrides and compare the values against the plan table above. To check overrides, create a CUSTOM license with `--maxPlayers 24 --maxActivations 2 --premiumReports true --developerMode false --customTheme false`. `license:get` and its later activation response should reflect those exact values. Boolean arguments require `true` or `false`; invalid plans, non-positive limits, missing club names, and malformed dates should fail without creating a license.

### 3. Activation, normalization, and entitlement delivery

For the following examples, `ACTIVATION_CODE` and `LICENSE_ID` mean the values from creation. Set them in your local shell without sharing the code in logs or committing response files.

```bash
export ACTIVATION_CODE='paste-the-created-code'
export LICENSE_ID='paste-the-created-license-id'
node -e 'console.log(JSON.stringify({activationCode:process.env.ACTIVATION_CODE,installId:"17cc32aa-ccf3-46e7-b858-2747c1e1ac1b",appVersion:"0.8.1"}))' |
  curl -sS http://localhost:3000/api/v1/licenses/activate \
    -H 'Content-Type: application/json' --data-binary @- \
    -o /tmp/kouci-license-response.json
cat /tmp/kouci-license-response.json
npm run license:get -- --id "$LICENSE_ID"
```

Expect HTTP 200 and the signed response described above, with the correct club/plan/entitlements and installation UUID. Inspection should now show one activation. Repeat with a lowercase code, omitted hyphens, or surrounding whitespace: the same license should activate successfully. A malformed code has `INVALID_REQUEST`; a correctly formatted unknown code has `INVALID_LICENSE`.

### 4. Repeated requests and device limits

Repeat the activation request with the same installation and a newer `appVersion`. The activation ID and `activatedAt` should remain unchanged, `lastSeenAt`/`appVersion` should update, and the count should remain one. A freshly signed response may have a newer `issuedAt`.

Use another UUID, such as `27cc32aa-ccf3-46e7-b858-2747c1e1ac1b`, with the same one-slot license: expect HTTP 409 `DEVICE_LIMIT`. For a two-slot license, the first two distinct UUIDs should succeed and the third should fail. When manually exercising simultaneous requests for the last available slot, only one new installation should be recorded. Retrying a successful installation after a lost HTTP response should still succeed without allocating another slot.

### 5. Signed payload verification

```bash
npm run license:verify -- --file /tmp/kouci-license-response.json \
  --installId 17cc32aa-ccf3-46e7-b858-2747c1e1ac1b
```

Expect `{"valid":true}` and exit code 0. You can pass `--publicKey BASE64_SPKI_DER` to select the trusted public key explicitly. Verification performs no database or HTTP requests; the repository's environment configuration is still loaded. For manual verification of rejection behavior later, use a copy of the response with a modified field/signature, a different installation ID, or an unsupported version: verification should fail with a nonzero exit code. The attack-testing checklist remains unchecked because none of these checks were run.

### 6. Disable, enable, revoke, and expiration

```bash
npm run license:disable -- --id "$LICENSE_ID"
# Activate again: expect LICENSE_DISABLED, including for an existing installation.
npm run license:enable -- --id "$LICENSE_ID"
# Activate again from the registered installation: expect success.
npm run license:revoke -- --id "$LICENSE_ID"
# Activate again: expect LICENSE_REVOKED.
npm run license:enable -- --id "$LICENSE_ID"
```

Each command returns updated license metadata. Enabling explicitly restores ACTIVE even from REVOKED. These commands preserve activation records and expiration, so enabling does not free slots or make an expired license current.

`--expiresAt` accepts an ISO 8601 timestamp with timezone or non-negative Unix **seconds** through year 9999, such as `--expiresAt 1821275871`. Unix milliseconds are not supported. Invalid options now identify the failing argument, for example `Invalid --expiresAt: ...`.

To exercise expiration, create a separate license with `--expiresAt 2020-01-01T00:00:00Z`; activation should return `LICENSE_EXPIRED` and consume no slot. Create another with a future ISO timestamp or Unix seconds and verify that inspection shows the expected date and successful activation includes that expiry in Unix seconds. A license created without this option should remain non-expiring.

### 7. Reinstallation and administrative reset

```bash
npm run license:reset-activation -- --id "$LICENSE_ID" \
  --installId 17cc32aa-ccf3-46e7-b858-2747c1e1ac1b
npm run license:get -- --id "$LICENSE_ID"
```

Expect `resetCount: 1` when that installation exists, and a free slot afterward. Activate with the second UUID: it should now succeed. Repeating a reset for an absent installation should return zero. To clear every installation:

```bash
npm run license:reset-activation -- --id "$LICENSE_ID"
```

Status and expiry are unchanged. An unknown license ID should return `INVALID_LICENSE` and a nonzero CLI exit code.

To use the back-office endpoint, supply a random `LICENSE_ADMIN_TOKEN` of at least 32 characters in the backend environment and restart the server. Keep this token exclusively in the back office/server configuration. Send an empty JSON object to reset all devices:

```bash
curl -sS -X POST "http://localhost:3000/api/v1/licenses/$LICENSE_ID/reset-activation" \
  -H "Authorization: Bearer $LICENSE_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' --data '{}'
```

Send `{"installId":"17cc32aa-ccf3-46e7-b858-2747c1e1ac1b"}` to reset one installation. The result matches the CLI. Without server configuration the endpoint returns ADMIN_UNAVAILABLE; with a missing/incorrect bearer token it returns UNAUTHORIZED. Production callers must use HTTPS.

### 8. Request handling and operational behavior

When you choose to check these behaviors, invalid JSON/UUIDs/extra fields should return sanitized INVALID_REQUEST errors; bodies above 2 KiB should return REQUEST_TOO_LARGE; more than 10 requests in a minute to one licensing route from one IP should receive RATE_LIMITED. Production HTTPS behavior requires a correctly configured TLS proxy. Database failures should return SERVER_ERROR without database details. These are manual follow-up instructions, not completed security tests.

## Offline and mobile work remaining

The backend issues non-expiring licenses by default and requires no periodic connection. **Disable, revoke, and reset cannot invalidate a signed license already held by an offline installation.** Reset releases the server slot so a replacement installation can activate; the original offline installation may retain access. Immediate revocation would require an online validation/refresh design, outside this MVP.

The separate mobile repository must implement installation UUID persistence, the activation UI (including the longer code), embedded-public-key verification, SecureStore persistence, LicenseProvider, protected navigation, entitlement enforcement, and offline/reinstallation behavior. APK building and real-device validation are also still outstanding. See [the checked original TODO](licensing-todo.md) for the exact implementation status.
