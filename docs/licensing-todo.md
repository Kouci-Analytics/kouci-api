> **Backend implementation status:** checked items mean backend code/configuration has been implemented, not tested or deployed. No builds, type checks, automated tests, security tests, migration execution, or database license creation were performed. Mobile work, real-device checks, and acceptance testing remain unchecked. A local Ed25519 key pair was generated in the ignored `.env.license` file. See [implementation details and manual feature checks](licensing.md).
>
> **Integration differences:** generated codes contain seven groups of four base32 characters (140 bits), rather than the shorter illustrative codes below. The canonical endpoint is `POST /api/v1/licenses/activate`. Signed payloads also include `version`, `customTheme`, and nullable `expiresAt`. Public-key embedding and all entitlement enforcement in the app remain mobile tasks. Backend request validation/security basics refer to the newly added licensing routes.

# 1. Kouci Startup summary

```
App
 │
 ▼
Initialize DB
 │
 ▼
LicenseProvider
 │
 ├── License doesn't exist
 │        ↓
 │   /activation
 │
 └── License exists
          ↓
    Verify signature
          │
          ├── INVALID
          │      ↓
          │   /activation
          │
          └── VALID
                 ↓
               /home
```

## 1.1 Do not create a different .apk for each coach, for now

In the future, the main goal is to have a different .apk for each club, but to make things simple, the MVP 1 will be just default kouci app without custom builds.

Base Setting: 
``` txt
1 APK + 1 licença = configuração daquele cliente
```

With this, Vitoria license could be:

```json
{
  "licenseId": "4a3c...",
  "club": "Vitoria SC",
  "plan": "BASIC",
  "maxPlayers": 18,
  "developerMode": false,
  "premiumReports": false,
  "issuedAt": 1787500000
}
```

**BASIC**
Max Players: 15

**PRO**
Max Players: 18
Premium Reports: True

**CUSTOM**
Max Players: 20
Custom Theme: True
Developer Mode: True

## 1.2 Licenses Server

Tables Schemas:
```txt
License
──────────────────────────────────
id                  UUID
codeHash            TEXT UNIQUE
clubName            TEXT
plan                TEXT
maxPlayers          INTEGER
status              TEXT
maxActivations      INTEGER
createdAt           TIMESTAMP
expiresAt           TIMESTAMP NULL

Activation
────────────
id
licenseId
deviceIdHash
activatedAt
lastSeenAt
appVersion
```

With this schema we have:
```
Licença Vitória SC
        │
        └── Device abc123...
              activated: 2026-08-24
```

## 1.3 Secure Product Activation Steps

### 1.3.1 Key Generation

Is going to be necessary to generate an activation key at server side and attach this activation key for each **Activation Table** entry.

Is not needed to save the activation key in plain text inside our database. We can apply the cipher:

```
HMAC-SHA256(serverSecret, activationCode)
```

Then save the result of this HMAC inside our db, if someone steals our database, he still couldn't access our keys.

### 1.3.2 First launch of the app

Kouci app generates an unique identifier for the installation. For example:
```
installId = 17cc32aa-ccf3-46e7-b858-2747c1e1ac1b
```
This value is stored locally in the device and then after submitting the key in the welcoming 
panel, a POST to Kouci API is sent.

```JSON
POST /api/v1/license/activate
body: {
  "activationCode": "KOUCI-Y7KD-49FP-WM2X-8KQR",
  "installId": "17cc32aa-ccf3-46e7-b858-2747c1e1ac1b",
  "appVersion": "0.8.1"
}
```

### 1.3.3 Server Verifies The Request

```
activationCode
      │
      ▼
calculate hash
      │
      ▼
find License
      │
      ├── doesn't exist ──> INVALID_LICENSE
      │
      ├── disabled ────> LICENSE_DISABLED
      │
      ├── already active in other device ──> DEVICE_LIMIT
      │
      └── valid
             │
             ▼
       register device ──> VALID_LICENSE
```

### 1.3.4 Local Kouci Application Response Validation

We can't return a `"valid": true` from the license server. Because a cracker could search for this field saved inside the device and just change the values to behave like the validation was done successfully.

Instead, server must create a digitally signed license with `Ed25519`, for example:

```json
{
  "licenseId": "8da42...",
  "deviceId": "17cc32aa...",
  "club": "Vitoria SC",
  "plan": "MVP_TESTER",
  "maxPlayers": 18,
  "premiumReports": false,
  "developerMode": false,
  "issuedAt": 1787500000
}


---- Server Architecture ----
LICENSE_SIGNING_PRIVATE_KEY
            │
            ▼
      license payload
            │
            ▼
          SIGN
            │
            ▼
	  signed license
```

The private key should **NEVER** be stored in the local device, instead, the key stored is the **Public Key**.
An attacker could get the public key freely, we don't need to worry about that.

Finally, save the license inside the SecureStore of the device, with `expo-secure-store` at `kouci.installId` and `kouci.license`.

Is not a very reliable protection against a rooted device, but for MVP 1 is sufficient.

## 1.4 License Expiration

For the first MVP, an expiration of the stored license is not mandatory, this would just increase the complexity of our back-end without any return.
As the app is offline and we are handling the app to trustful coaches, the **First Activation** of the product must be connected to internet, afterwards the connections is not needed. So: `expiresAt = null`

## 1.5 Corner Case: Kouci App Reinstall

It's possible that a coach uninstall the app during a period of time or he just wants to change devices (or maybe a factory reset). In this case, the secure store with the license would be wiped out. 

To fix this, we can create an api route that resets an activation of a product, doing the entire process of subscription again.

This api route can be accessed through a posterior back-office we own.


# 2 To Do

## 2.1 License Backend [CRITICAL]

### Database
- [x] Create `licenses` table
  - [x] id UUID
  - [x] codeHash
  - [x] clubName
  - [x] plan
  - [x] maxPlayers
  - [x] status
  - [x] maxActivations
  - [x] createdAt
  - [x] expiresAt nullable

- [x] Create `activations` table
  - [x] id UUID
  - [x] licenseId
  - [x] installIdHash / device identifier
  - [x] activatedAt
  - [x] lastSeenAt
  - [x] appVersion

- [x] Add relation:
      License 1 → N Activations

- [x] Create Drizzle migrations
- [ ] Test database migration on development database


## 2.2 License Key Generation [CRITICAL]

- [x] Create secure activation-key generator

Example:
KOUCI-7K3D-P9XM-Q2RT-W8LF

- [x] Use cryptographically secure randomness
- [x] Generate at least ~128 bits of randomness
- [x] Never generate licenses using Math.random()

- [x] Hash activation codes before storing them
- [x] Store only:
      SHA-256(activationCode)
      or
      HMAC-SHA256(serverSecret, activationCode)

- [x] Create CLI/admin script:

      npm run license:create

- [x] Allow generator to configure:
  - [x] club
  - [x] plan
  - [x] maxPlayers
  - [x] maxActivations
  - [x] premiumReports
  - [x] developerMode

- [x] Print activation code ONCE after creation
- [ ] Test creating a Vitória SC test license


## 2.3 Signing Infrastructure [CRITICAL]

- [x] Generate Ed25519 signing key pair

- [x] PRIVATE KEY
  - [x] Store only on Kouci backend
  - [x] Put in environment variable / secret manager
  - [x] Never commit to Git
  - [x] Add `.env` to `.gitignore`

- [ ] PUBLIC KEY
  - [ ] Add to Kouci mobile app
  - [x] Use only for verification

- [x] Implement:

      signLicense(payload)

- [x] Implement:

      verifyLicense(payload, signature)

- [ ] Write unit test:
  - [ ] valid signature → accepted
  - [ ] modified payload → rejected
  - [ ] random signature → rejected


## 2.4 Activation API [CRITICAL]

- [x] Create:

      POST /api/v1/licenses/activate

- [x] Request:

      {
        activationCode,
        installId,
        appVersion
      }

- [x] Validate request with schema validation
- [x] Normalize activation code
- [x] Hash activation code
- [x] Find corresponding license

- [x] Reject:
  - [x] unknown license
  - [x] disabled license
  - [x] revoked license
  - [x] expired license
  - [x] activation limit reached

- [x] Check whether installId is already activated
- [x] Prevent one activation from consuming multiple slots

- [x] Create activation record

- [x] Generate license payload:

      {
        licenseId,
        club,
        plan,
        installId,
        maxPlayers,
        premiumReports,
        developerMode,
        issuedAt
      }

- [x] Sign payload using backend private key

- [x] Return:

      {
        license,
        signature
      }

- [x] NEVER return private signing information


## 2.5 Installation ID [CRITICAL]

- [ ] Install `expo-secure-store`

- [ ] On first launch:
  - [ ] check for existing `installId`
  - [ ] if missing → generate UUID
  - [ ] save UUID in SecureStore

- [ ] Create helper:

      getOrCreateInstallId()

- [ ] Never regenerate installId on normal application restart


## 2.6 Activation Screen [CRITICAL]

- [ ] Create `/activation` screen

- [ ] Add:
  - [ ] Kouci logo
  - [ ] Activation Code input
  - [ ] Activate button
  - [ ] Loading state
  - [ ] Error state

- [ ] Format code automatically:

      KOUCI-XXXX-XXXX-XXXX-XXXX

- [ ] Call activation API

- [ ] Handle errors:
  - [ ] INVALID_LICENSE
  - [ ] LICENSE_DISABLED
  - [ ] LICENSE_EXPIRED
  - [ ] DEVICE_LIMIT
  - [ ] NETWORK_ERROR
  - [ ] SERVER_ERROR

- [ ] Show user-friendly messages instead of API errors


## 2.7 Store Activated License [CRITICAL]

- [ ] After successful activation:
  - [ ] store license payload in SecureStore
  - [ ] store signature in SecureStore

Suggested keys:

kouci.installId
kouci.license
kouci.licenseSignature

- [ ] Do NOT store:

      licenseValid = true

- [ ] Do NOT store the activation state only in SQLite


## 2.8 Local License Verification [CRITICAL]

- [ ] Create:

      LicenseService

- [ ] Implement:

      loadLicense()

- [ ] Implement:

      verifyStoredLicense()

- [ ] Verify Ed25519 signature using embedded public key

- [ ] Verify:
  - [ ] signature
  - [ ] installId matches
  - [ ] required fields exist
  - [ ] license format/version supported

- [ ] If verification fails:
      → remove invalid license
      → redirect to activation


## 2.9 LicenseProvider [CRITICAL]

- [ ] Create React context:

      LicenseProvider

- [ ] Expose:

      license
      isLicensed
      isLoading
      plan
      club
      maxPlayers
      premiumReports
      developerMode

- [ ] Add hook:

      useLicense()

- [ ] App startup should become:

      DatabaseProvider
          ↓
      LicenseProvider
          ↓
      Router

- [ ] While license loads:
      show splash/loading

- [ ] Valid license:
      → app

- [ ] Missing/invalid license:
      → activation


## 2.10 Route Protection [CRITICAL]

- [ ] Prevent navigation around ActivationScreen

- [ ] Test deep links
- [ ] Test app restart
- [ ] Test direct route access

- [ ] Make sure user cannot access:

      /home
      /matches
      /players
      /settings

      without a valid license


## 2.11 Player Limit Entitlement [MVP]

- [ ] Replace hardcoded player limit

Instead of:

      MAX_PLAYERS = 18

Use:

      license.maxPlayers

- [ ] Before creating player:

      currentPlayerCount < license.maxPlayers

- [ ] Disable Add Player when limit reached
- [ ] Show useful message:

      "Your package supports up to 18 players."

- [ ] Make sure limit is also checked in business logic,
      not only hidden in the UI


## 2.12 Package / Settings UI [MVP]

- [ ] Show current package in Settings

Example:

      Club
      Vitória SC

      Package
      MVP Tester

      Player slots
      12 / 18

- [ ] Show license information
- [ ] Show application version

- [ ] Do NOT show:
  - [ ] activation hash
  - [ ] signatures
  - [ ] signing keys
  - [ ] internal security information


## 2.13 Developer Mode Entitlement [MVP]

- [ ] Move developer-mode permission to license

Example:

      developerMode: false

- [ ] Only show Developer Mode settings when allowed
- [ ] Do not rely only on hiding the UI
- [ ] Check permission when developer functionality is executed


## 2.14 License Administration [IMPORTANT]

- [x] Create command to list licenses

      npm run license:list

- [x] Create command to inspect license

      npm run license:get

- [x] Create command to disable license

      npm run license:disable

- [x] Create command to enable license

      npm run license:enable

- [x] Create command to reset activations

      npm run license:reset-activation

This is important when a coach:

      changes phone
      reinstalls app
      loses device


## 2.15 Backend Security Basics [CRITICAL]

- [x] HTTPS only in production — enforced on licensing routes; TLS proxy deployment is still required
- [x] Validate all request bodies
- [x] Limit activation endpoint request size
- [x] Add rate limiting

Example:

      ~5-10 activation attempts / minute / IP

- [x] Never log activation codes in production
- [x] Never log private signing key
- [x] Sanitize errors returned to client
- [x] Use environment variables for secrets

- [x] Make sure `.env` is ignored by Git

- [ ] Check Git history for accidentally committed secrets


## 2.16 Offline Behaviour [CRITICAL]

Desired MVP behaviour:

First activation
      ↓
Internet required
      ↓
License downloaded
      ↓
Future launches
      ↓
Offline allowed

- [ ] Test app with airplane mode AFTER activation
- [ ] Test app with no Wi-Fi at pool
- [ ] App must still open
- [ ] Match recording must work completely offline
- [ ] Player management must work offline
- [ ] Match analysis must work offline


## 2.17 Reinstallation Behaviour [TEST]

- [ ] Activate test device
- [ ] Close application
- [ ] Reopen → still licensed
- [ ] Restart phone → still licensed
- [ ] Update APK → still licensed
- [ ] Confirm SQLite data survives application update
- [ ] Confirm SecureStore license survives application update

- [ ] Uninstall app
- [ ] Reinstall app
- [ ] Verify expected activation behaviour

For MVP:

      new installation
          ↓
      DEVICE_LIMIT
          ↓
      Pedro manually resets activation


## 2.18 Attack / Failure Testing [BEFORE RELEASE]

### License attacks
- [ ] Wrong activation code
- [ ] Empty activation code
- [ ] Modified activation code
- [ ] Same key from second installation
- [ ] Disabled key
- [ ] Fake signed license
- [ ] Change `maxPlayers` manually
- [ ] Change `plan` manually
- [ ] Change `club` manually
- [ ] Change `developerMode` manually

Expected result:

      signature verification fails


### Network tests
- [ ] Backend unavailable during first activation
- [ ] Backend timeout
- [ ] Slow connection
- [ ] Internet disappears during activation
- [ ] Server returns HTTP 500


### Application tests
- [ ] Force-close application during activation
- [ ] Restart after activation
- [ ] Restart while offline
- [ ] Update APK over existing installation


## 2.19 Release Build [CRITICAL]

- [ ] Create production Android build
- [ ] Sign APK using production Android signing key
- [ ] Keep Android keystore backed up securely
- [ ] Never lose Android signing key

- [ ] Verify release build uses production API URL
- [ ] Verify development API URL is absent
- [ ] Verify debugging is disabled

- [ ] Test FINAL APK on actual coach-like Android device


## 2.20 Real Vitória SC Test

- [ ] Generate real Vitória SC activation key

Example configuration:

      club: Vitória SC
      plan: MVP_TESTER
      maxPlayers: 18
      maxActivations: 1
      premiumReports: false
      developerMode: false

- [ ] Install production APK
- [ ] Activate with real license
- [ ] Close/reopen application
- [ ] Test offline
- [ ] Add players
- [ ] Reach player limit
- [ ] Create opponent
- [ ] Create match
- [ ] Record actions
- [ ] Record shots
- [ ] Record goalkeeper saves
- [ ] Finish match
- [ ] Open old match
- [ ] Confirm statistics persisted

- [ ] Give APK + activation code to coach


# MVP SECURITY DONE ✅

The MVP licensing system is considered ready when:

- [ ] APK cannot enter the application without activation
- [ ] Valid activation works
- [ ] Activation is limited to intended installation/device
- [x] License is digitally signed
- [x] Private key exists only on server
- [ ] License survives app restart
- [ ] App works offline after activation
- [ ] Tampering with license invalidates it
- [ ] Player limits come from license
- [x] You can manually reset an activation
- [ ] Production APK works on a real Android device
