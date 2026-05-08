# Signature Card Management System

A secure, accessible web application for managing authorized signers on business accounts. Built with React 18+, Vite, and Tailwind CSS, the system provides a guided workflow for controlling parties to add, edit, remove, unlock, and resend invitations to authorized signers — all within a single-page application backed by localStorage for state persistence.

---

## Table of Contents

1. [Overview](#overview)
2. [Business Context](#business-context)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Getting Started](#getting-started)
6. [Available Scripts](#available-scripts)
7. [Environment Variables](#environment-variables)
8. [Workflow Steps](#workflow-steps)
9. [Mock Data Documentation](#mock-data-documentation)
10. [Accessibility Compliance](#accessibility-compliance)
11. [Branding Guidelines](#branding-guidelines)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [License](#license)

---

## Overview

The Signature Card Management System enables authorized controlling parties to manage signers on their business accounts through a secure, step-by-step online workflow. The application guides users through identity verification, account selection, signer management, change review, and submission — replacing traditional paper-based signature card processes.

Key capabilities include:

- **Authentication & Session Management** — Secure login with rate-limited attempts, configurable session timeout, and session warning modals.
- **Identity Verification (OTP)** — One-time passcode delivery via email or SMS with expiry timers, cooldown periods, and attempt tracking.
- **eSign Token Validation** — URL-based token capture and validation with expiration and user association checks.
- **Account Selection** — Display of eligible accounts with masked account numbers, type badges, and auto-selection for single-account users.
- **Signer Management** — Full CRUD operations on authorized signers with search, filter, sort, and pagination.
- **Self-Service Unlock & Resend** — Rate-limited unlock and invitation resend actions with attempt-based messaging.
- **Change Review & Submission** — Grouped change summary (additions, edits, removals), legal consent, and confirmation number generation.
- **Audit Logging** — Immutable, append-only audit trail with automatic PII masking for all user actions.

---

## Business Context

Financial institutions require authorized signer management for business accounts. Traditionally, this process involves paper signature cards that must be physically signed, notarized, and submitted. This application digitizes the workflow, allowing controlling parties to:

1. Verify their identity through multi-factor authentication
2. Select the business account to manage
3. Add new authorized signers with pending invitations
4. Edit existing signer information with before/after tracking
5. Remove signers (with last-signer protection)
6. Unlock locked signer accounts
7. Resend pending invitations
8. Review all changes and submit with legal acknowledgment
9. Receive a confirmation number for tracking

All changes are subject to review and approval by the financial institution after submission.

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3+ | UI component library |
| **Vite** | 5.4+ | Build tool and development server |
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework |
| **JavaScript (ES6+)** | — | Application language (JSX) |
| **React Router** | 6.26+ | Client-side routing |
| **PropTypes** | 15.8+ | Runtime prop type checking |
| **localStorage** | — | Client-side state persistence and mock data store |
| **Vitest** | 2.1+ | Unit and integration testing framework |
| **Testing Library** | 16.0+ | React component testing utilities |
| **PostCSS** | 8.4+ | CSS processing (Tailwind integration) |
| **Autoprefixer** | 10.4+ | CSS vendor prefix automation |

> **Note:** This application uses localStorage as its data store for all mock data, session management, audit logging, and staged changes. No backend API or database is required.

---

## Folder Structure

```
signature-card-mgmt/
├── index.html                          # HTML entry point
├── package.json                        # Dependencies and scripts
├── vite.config.js                      # Vite build configuration
├── vitest.config.js                    # Vitest test configuration
├── tailwind.config.js                  # Tailwind CSS configuration
├── postcss.config.js                   # PostCSS plugin configuration
├── vercel.json                         # Vercel deployment and SPA routing
├── .env.example                        # Environment variable template
├── CHANGELOG.md                        # Version history
├── DEPLOYMENT.md                       # Deployment guide
├── README.md                           # This file
│
└── src/
    ├── main.jsx                        # Application entry point
    ├── App.jsx                         # Root component with routing and providers
    ├── index.css                       # Global styles and Tailwind directives
    │
    ├── components/                     # Reusable UI components
    │   ├── AccountCard.jsx             # Account display card with selection
    │   ├── Alert.jsx                   # Alert/notification component (critical, warning, success, info)
    │   ├── Button.jsx                  # Button component (primary, secondary, danger, link)
    │   ├── ChangesSummary.jsx          # Grouped changes display (additions, edits, removals)
    │   ├── ErrorBoundary.jsx           # React error boundary with fallback UI
    │   ├── ExitConfirmationModal.jsx   # Unsaved changes exit confirmation dialog
    │   ├── FilterSort.jsx              # Search, filter, and sort controls
    │   ├── FormField.jsx               # Floating label form input with validation
    │   ├── LegalConsent.jsx            # Legal disclaimer with consent checkbox
    │   ├── Modal.jsx                   # Accessible modal dialog with focus trapping
    │   ├── PageLayout.jsx              # Consistent page structure with header/footer
    │   ├── Pagination.jsx              # Page navigation with ellipsis
    │   ├── ProgressIndicator.jsx       # Step-based workflow progress display
    │   ├── ProtectedRoute.jsx          # Route guard for authentication/verification
    │   ├── RemoveSignerModal.jsx       # Signer removal confirmation dialog
    │   ├── ResendInvitationButton.jsx  # Rate-limited invitation resend action
    │   ├── SessionTimeoutModal.jsx     # Session expiry warning with countdown
    │   ├── SignerCard.jsx              # Signer display card with action buttons
    │   ├── SignerForm.jsx              # Add/edit signer form with validation
    │   └── UnlockSignerButton.jsx      # Rate-limited signer unlock action
    │
    ├── context/                        # React context providers
    │   ├── AppContext.jsx              # Application state (selected account, staged changes)
    │   ├── NavigationContext.jsx       # Workflow step navigation and ordering
    │   └── SessionContext.jsx          # Reactive session state and authentication
    │
    ├── data/                           # Mock data fixtures (JSON)
    │   ├── accounts.json               # Account fixtures (6 accounts, 3 users)
    │   ├── messages.json               # Content-managed messages (errors, success, session, validation)
    │   ├── signers.json                # Signer fixtures (12 signers, mixed statuses)
    │   ├── tokens.json                 # eSign token fixtures (8 tokens, mixed statuses)
    │   ├── users.json                  # User fixtures (3 users with credentials and profiles)
    │   └── welcomeContent.json         # Welcome screen content (steps, disclaimer, CTA)
    │
    ├── pages/                          # Page-level screen components
    │   ├── AccountSelectionScreen.jsx  # Step 5: Account selection with pagination
    │   ├── AddSignerScreen.jsx         # Step 6a: Add new signer form
    │   ├── ConfirmSignersScreen.jsx    # Step 7: Changes summary review
    │   ├── EditSignerScreen.jsx        # Step 6b: Edit existing signer form
    │   ├── ErrorScreen.jsx             # Error display (token, session, network, server)
    │   ├── IdentityVerificationScreen.jsx # Step 3: OTP delivery and verification
    │   ├── LoginScreen.jsx             # Step 2: Username/password authentication
    │   ├── ReviewSignersScreen.jsx     # Step 8: Final review with legal consent
    │   ├── SignerManagementScreen.jsx  # Step 6: Signer list with CRUD actions
    │   ├── SubmissionConfirmationScreen.jsx # Step 9: Submission confirmation
    │   ├── TokenValidationScreen.jsx   # Step 4: eSign token validation
    │   ├── WelcomeScreen.jsx           # Step 1: Welcome and onboarding
    │   └── __tests__/                  # Page-level integration tests
    │       ├── LoginScreen.test.jsx
    │       └── SignerManagementScreen.test.jsx
    │
    ├── services/                       # Business logic and data access
    │   ├── AccountService.js           # Account retrieval and masking
    │   ├── AuditLogService.js          # Extended signer management audit logging
    │   ├── AuditService.js             # Core audit logging with PII masking
    │   ├── AuthService.js              # Authentication, lockout, and session creation
    │   ├── RateLimitService.js         # Daily rate limiting for unlock/resend actions
    │   ├── SessionService.js           # Session CRUD, expiry, and activity tracking
    │   ├── SignerService.js            # Signer CRUD, staged changes, unlock, resend
    │   ├── SubmissionService.js        # Change submission with idempotency
    │   ├── TokenService.js             # Token capture, validation, and status management
    │   ├── VerificationService.js      # OTP send, verify, cooldown, and session termination
    │   └── __tests__/                  # Service-level unit tests
    │       ├── AuthService.test.js
    │       ├── RateLimitService.test.js
    │       ├── SignerService.test.js
    │       └── VerificationService.test.js
    │
    ├── test/                           # Test configuration
    │   └── setup.js                    # Test setup with localStorage mock and jest-dom matchers
    │
    └── utils/                          # Shared utilities
        ├── constants.js                # Application constants (steps, storage keys, config)
        ├── helpers.js                  # General utilities (ID generation, formatting, classNames)
        ├── masking.js                  # PII masking (account, email, phone, name, SSN)
        ├── validators.js               # Form validation (email, phone, name, OTP, password, signer form)
        └── __tests__/
            └── validators.test.js      # Validator unit tests
```

---

## Getting Started

### Prerequisites

- **Node.js** v18.x or later
- **npm** v9.x or later

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd signature-card-mgmt

# Install dependencies
npm install
```

### Environment Configuration

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

The `.env` file is listed in `.gitignore` and will not be committed to the repository. See [Environment Variables](#environment-variables) for details.

### Running the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3000` and open automatically in your default browser.

### Demo Credentials

The following test accounts are available for login:

| Username | Password | User ID | Accounts |
|---|---|---|---|
| `jsmith` | `Password1!` | USR-001 | 3 accounts (Checking, Savings, Money Market) |
| `mjohnson` | `Secure2@` | USR-002 | 1 account (Checking) |
| `bwilliams` | `Test3#abc` | USR-003 | 2 accounts (Checking, Savings) |

**OTP Demo Code:** Enter `123456` when prompted for the one-time passcode during identity verification.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| **dev** | `npm run dev` | Starts the Vite development server on port 3000 |
| **build** | `npm run build` | Builds the production bundle to `dist/` |
| **preview** | `npm run preview` | Serves the production build locally for testing |
| **test** | `npm run test` | Runs all unit and integration tests via Vitest |
| **lint** | `npm run lint` | Runs ESLint with zero-warning enforcement |

---

## Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in the client-side application via `import.meta.env`.

| Variable | Default | Description |
|---|---|---|
| `VITE_SESSION_TIMEOUT_MINUTES` | `15` | Session timeout duration in minutes |
| `VITE_SESSION_WARNING_MINUTES` | `13` | Minutes before timeout to show warning modal |
| `VITE_OTP_EXPIRY_SECONDS` | `300` | OTP code expiration time in seconds |
| `VITE_TOKEN_EXPIRY_HOURS` | `72` | eSign token expiration time in hours |
| `VITE_MAX_LOGIN_ATTEMPTS` | `5` | Maximum failed login attempts before lockout |
| `VITE_MAX_OTP_ATTEMPTS` | `3` | Maximum OTP verification attempts per session |
| `VITE_MAX_OTP_RESENDS` | `3` | Maximum OTP resend requests per session |
| `VITE_MAX_UNLOCK_ATTEMPTS_PER_DAY` | `3` | Maximum signer unlock attempts per calendar day |
| `VITE_MAX_RESEND_ATTEMPTS_PER_DAY` | `3` | Maximum invitation resend attempts per calendar day |

---

## Workflow Steps

The application follows a linear, step-based workflow with enforced ordering:

| Step | Route | Screen | Auth | Verified | Token |
|---|---|---|---|---|---|
| 1 | `/` | Welcome & Onboarding | No | No | No |
| 2 | `/login` | Login | No | No | No |
| 3 | `/verify` | Identity Verification (OTP) | Yes | No | No |
| 4 | `/validate-token` | eSign Token Validation | Yes | Yes | No |
| 5 | `/select-account` | Account Selection | Yes | Yes | Yes |
| 6 | `/manage-signers` | Signer Management | Yes | Yes | Yes |
| 6a | `/add-signer` | Add Signer | Yes | Yes | Yes |
| 6b | `/edit-signer/:id` | Edit Signer | Yes | Yes | Yes |
| 7 | `/confirm-signers` | Confirm Changes | Yes | Yes | Yes |
| 8 | `/review-signers` | Review & Submit | Yes | Yes | Yes |
| 9 | `/submission-confirmation` | Submission Confirmation | Yes | Yes | Yes |
| — | `/error` | Error Screen | No | No | No |

**Navigation Rules:**
- Forward navigation is restricted to the next uncompleted step
- Backward navigation is allowed to any prior step
- Navigation state is persisted in localStorage and session
- Route guards enforce authentication, verification, and token validation requirements

---

## Mock Data Documentation

All mock data is stored as static JSON files in `src/data/` and loaded into localStorage on first access.

### Users (`users.json`)

Three test users with credentials, profiles (including masked PII), account associations, and login status. Passwords are stored in plaintext for demo purposes only.

### Accounts (`accounts.json`)

Six business accounts across three users with types (Checking, Savings, Money Market), masked account numbers, and signer counts.

### Signers (`signers.json`)

Twelve signers across six accounts with mixed statuses:
- **Active** — Fully enrolled signers
- **Pending** — Signers awaiting invitation acceptance
- **Locked** — Signers with locked access (eligible for unlock)
- **Removed** — Previously removed signers (excluded from default views)

Each signer includes name parts, title, role, masked contact information, invitation records, and date added.

### Tokens (`tokens.json`)

Eight eSign tokens with mixed statuses:
- **Pending** — Awaiting validation
- **Confirmed** — Successfully validated
- **Expired** — Past expiration date

Each token is associated with a specific user and includes creation and expiration timestamps.

### Messages (`messages.json`)

Content-managed message strings organized by category:
- `unlock` — Attempt-based unlock messaging (1 of 3, 2 of 3, Final, Exhausted)
- `resend` — Attempt-based resend messaging
- `errors` — Error messages (credentials, OTP, token, network, server)
- `success` — Success messages (login, OTP, signer operations, submission)
- `session` — Session timeout and logout messages
- `validation` — Form validation message templates with placeholder tokens
- `confirmation` — Confirmation dialog messages (remove, submit, cancel, logout)
- `login` — Login-specific attempt warnings

### Welcome Content (`welcomeContent.json`)

Welcome screen content including title, subtitle, process step cards (with icon keys, titles, and descriptions), estimated time display, legal disclaimer text, and CTA button text.

---

## Accessibility Compliance

The application is designed to meet **WCAG 2.1 Level AA** standards:

### Semantic HTML
- Proper heading hierarchy (`h1` → `h2` → `h3`)
- Semantic landmarks (`role="main"`, `role="search"`, `role="navigation"`)
- Form elements with associated `<label>` elements via `htmlFor`

### ARIA Attributes
- `role` attributes: `alert`, `dialog`, `listbox`, `option`, `radio`, `radiogroup`, `region`, `list`, `listitem`, `document`, `presentation`
- State attributes: `aria-selected`, `aria-checked`, `aria-invalid`, `aria-required`, `aria-disabled`, `aria-expanded`, `aria-busy`, `aria-current`
- Relationship attributes: `aria-label`, `aria-labelledby`, `aria-describedby`
- Live regions: `aria-live="assertive"` for errors, `aria-live="polite"` for status updates, `aria-atomic="true"` for complete announcements

### Keyboard Navigation
- Full keyboard operability for all interactive elements
- `Enter`/`Space` activation for buttons and selectable items
- `Tab`/`Shift+Tab` focus cycling through interactive elements
- `Escape` to close modals and dialogs
- `Arrow Up`/`Arrow Down` for list navigation (account selection)
- Focus trapping within modal dialogs
- Focus restoration on modal close

### Visual Accessibility
- Visible focus indicators: `focus:ring-2 focus:ring-primary-blue focus:ring-offset-2`
- Color contrast compliant text and interactive elements
- Error states communicated through both color and text
- Status badges with text labels (not color alone)

### Form Accessibility
- Floating label pattern with proper label association
- Inline validation errors linked via `aria-describedby`
- Required fields marked with `aria-required="true"` and visual asterisk
- Error announcements via `role="alert"`

---

## Branding Guidelines

### Colors

| Token | Hex | Usage |
|---|---|---|
| `primary-blue` | `#00468b` | Primary actions, links, focus rings, progress indicators |
| `body` | `#292929` | Body text, headings |
| Gray scale | Tailwind defaults | Borders, backgrounds, secondary text |
| Green | Tailwind defaults | Success states, active badges, additions |
| Amber/Yellow | Tailwind defaults | Warning states, pending badges, edits |
| Red | Tailwind defaults | Error states, locked badges, removals, danger actions |

### Typography

- **Font Family:** Roboto (loaded via Google Fonts)
- **Weights:** 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold)
- **Body Text:** `text-sm` (14px) with `text-body` color
- **Headings:** `text-2xl` (24px) for page titles, `text-lg` (18px) for section headings, `text-base` (16px) for card headings

### Layout

- **Max Width:** 1200px (`fluid-wrapper` class)
- **Horizontal Padding:** `px-4` (16px)
- **Breakpoints:**
  - `mobile`: 320px
  - `tablet`: 640px
  - `desktop`: 1024px
  - `widescreen`: 1200px

### Component Patterns

- **Buttons:** Primary (filled blue), Secondary (outlined blue), Danger (filled red), Link (underlined blue)
- **Cards:** Rounded borders, subtle shadows, hover shadow elevation
- **Badges:** Rounded-full with colored backgrounds and borders
- **Alerts:** Rounded with colored left border, icon, and dismissible close button
- **Modals:** Centered overlay with backdrop, focus trapping, and Escape key support
- **Form Fields:** Floating label pattern with animated transitions

---

## Testing

The project uses **Vitest** with **@testing-library/react** for testing.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (development)
npx vitest
```

### Test Coverage

The test suite covers:

- **Services:** AuthService, VerificationService, SignerService, RateLimitService
- **Validators:** Email, phone, name, OTP, password, signer form composite validation
- **Pages:** LoginScreen (rendering, validation, lockout, audit, accessibility), SignerManagementScreen (rendering, filtering, sorting, actions, accessibility)

### Test Setup

The test environment uses `jsdom` with a custom localStorage mock defined in `src/test/setup.js`. The setup file is configured in `vitest.config.js` and provides:

- `@testing-library/jest-dom` matchers
- localStorage mock with `getItem`, `setItem`, `removeItem`, `clear`, `length`, and `key` methods
- Automatic localStorage clearing before each test via `beforeEach`

---

## Deployment

The application is configured for deployment on **Vercel** with SPA routing support. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:

- Vercel project configuration
- Environment variable setup
- SPA rewrite rules
- Security headers
- CI/CD integration
- Troubleshooting

### Quick Deploy

```bash
# Validate the build locally
npm run build
npm run preview

# Deploy via Vercel CLI
npx vercel
```

---

## License

This project is private and proprietary.