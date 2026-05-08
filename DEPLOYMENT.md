# Deployment Guide

## Signature Card Management System

This document covers deployment procedures for the Signature Card Management System, including Vercel deployment, environment configuration, SPA routing, security headers, and CI/CD considerations.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Validation Checklist](#build-validation-checklist)
3. [Vercel Deployment](#vercel-deployment)
4. [Environment Variables Configuration](#environment-variables-configuration)
5. [SPA Routing Setup](#spa-routing-setup)
6. [Security Headers Configuration](#security-headers-configuration)
7. [CI/CD Notes](#cicd-notes)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **Git**: Repository hosted on GitHub, GitLab, or Bitbucket
- **Vercel Account**: Free or Pro tier at [vercel.com](https://vercel.com)

---

## Build Validation Checklist

Before deploying, verify the build completes successfully in your local environment:

### 1. Install Dependencies

```bash
npm install
```

Confirm that `node_modules/` is created and no dependency errors are reported.

### 2. Run Linting

```bash
npm run lint
```

Ensure zero warnings and zero errors before proceeding.

### 3. Run Tests

```bash
npm run test
```

All unit and integration tests must pass. The test suite covers:

- `AuthService` (login, logout, lockout, audit logging)
- `VerificationService` (OTP send, verify, cooldown, session termination)
- `SignerService` (CRUD operations, staged changes, unlock, resend)
- `RateLimitService` (daily limits, reset, independent tracking)
- Validators (email, phone, name, OTP, password, signer form)
- `LoginScreen` (rendering, validation, lockout, audit, accessibility)
- `SignerManagementScreen` (rendering, filtering, sorting, actions, accessibility)

### 4. Build the Application

```bash
npm run build
```

Verify the following:

- The command exits with code `0` (no errors)
- A `dist/` directory is generated in the project root
- The `dist/` directory contains an `index.html` file
- The `dist/assets/` directory contains bundled `.js` and `.css` files

### 5. Preview the Build Locally

```bash
npm run preview
```

Open the preview URL (typically `http://localhost:4173`) and verify:

- The welcome screen loads correctly
- Navigation between pages works
- Styles are applied correctly
- No console errors appear in the browser developer tools

---

## Vercel Deployment

### Step 1: Connect Your Repository

1. Log in to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Select your Git provider (GitHub, GitLab, or Bitbucket)
4. Authorize Vercel to access your repositories if prompted
5. Find and select the `signature-card-mgmt` repository
6. Click **"Import"**

### Step 2: Configure Build Settings

On the project configuration screen, set the following:

| Setting              | Value           |
|----------------------|-----------------|
| **Framework Preset** | Vite            |
| **Build Command**    | `npm run build` |
| **Output Directory** | `dist`          |
| **Install Command**  | `npm install`   |
| **Node.js Version**  | 18.x            |

> **Note:** Vercel typically auto-detects Vite projects. Verify the settings match the table above before deploying.

### Step 3: Configure Environment Variables

Add all required environment variables before the first deployment. See the [Environment Variables Configuration](#environment-variables-configuration) section below.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (typically 1–2 minutes)
3. Verify the deployment URL loads the application correctly
4. Test the full workflow: Welcome → Login → Verify → Token Validation → Account Selection → Signer Management → Confirm → Review → Submit

### Step 5: Configure Custom Domain (Optional)

1. Navigate to **Settings** → **Domains**
2. Add your custom domain
3. Follow the DNS configuration instructions provided by Vercel
4. Verify SSL certificate is provisioned automatically

---

## Environment Variables Configuration

All environment variables must be prefixed with `VITE_` to be accessible in the client-side application via `import.meta.env`.

### Required Variables

Configure these in the Vercel dashboard under **Settings** → **Environment Variables**:

| Variable                            | Default Value | Description                                      |
|-------------------------------------|---------------|--------------------------------------------------|
| `VITE_SESSION_TIMEOUT_MINUTES`      | `15`          | Session timeout duration in minutes               |
| `VITE_SESSION_WARNING_MINUTES`      | `13`          | Minutes before timeout to show warning modal      |
| `VITE_OTP_EXPIRY_SECONDS`           | `300`         | OTP code expiration time in seconds               |
| `VITE_TOKEN_EXPIRY_HOURS`           | `72`          | eSign token expiration time in hours              |
| `VITE_MAX_LOGIN_ATTEMPTS`           | `5`           | Maximum failed login attempts before lockout      |
| `VITE_MAX_OTP_ATTEMPTS`             | `3`           | Maximum OTP verification attempts per session     |
| `VITE_MAX_OTP_RESENDS`              | `3`           | Maximum OTP resend requests per session           |
| `VITE_MAX_UNLOCK_ATTEMPTS_PER_DAY`  | `3`           | Maximum signer unlock attempts per calendar day   |
| `VITE_MAX_RESEND_ATTEMPTS_PER_DAY`  | `3`           | Maximum invitation resend attempts per calendar day|

### Setting Environment Variables in Vercel

1. Navigate to your project in the Vercel dashboard
2. Go to **Settings** → **Environment Variables**
3. For each variable:
   - Enter the variable name (e.g., `VITE_SESSION_TIMEOUT_MINUTES`)
   - Enter the value (e.g., `15`)
   - Select the environments: **Production**, **Preview**, and/or **Development**
   - Click **"Save"**
4. After adding all variables, trigger a redeployment for changes to take effect

### Environment-Specific Overrides

You can set different values per environment:

- **Production**: Use stricter limits (e.g., `VITE_MAX_LOGIN_ATTEMPTS=5`)
- **Preview**: Use the same values as production for accurate testing
- **Development**: Use relaxed limits for easier local development (e.g., `VITE_MAX_LOGIN_ATTEMPTS=10`)

### Local Development

For local development, copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

The `.env` file is listed in `.gitignore` and will not be committed to the repository.

---

## SPA Routing Setup

The application uses React Router for client-side routing. A `vercel.json` configuration file is included in the project root to handle SPA routing on Vercel.

### vercel.json Configuration

The existing `vercel.json` file contains the following rewrite rule:

```json
{
  "rewrites": [
    {
      "source": "/((?!assets/).*)",
      "destination": "/index.html"
    }
  ]
}
```

This configuration ensures that:

- All routes that do not match a static asset in the `assets/` directory are rewritten to `index.html`
- React Router handles all client-side route resolution
- Direct URL access to any route (e.g., `/login`, `/manage-signers`) works correctly
- Browser refresh on any route loads the application without a 404 error
- Static assets (JavaScript bundles, CSS files, images) in `dist/assets/` are served directly

### Application Routes

The following routes are defined in `src/App.jsx`:

| Route                       | Component                      | Auth Required | Verification Required | Token Required |
|-----------------------------|--------------------------------|---------------|----------------------|----------------|
| `/`                         | `WelcomeScreen`                | No            | No                   | No             |
| `/login`                    | `LoginScreen`                  | No            | No                   | No             |
| `/verify`                   | `IdentityVerificationScreen`   | Yes           | No                   | No             |
| `/validate-token`           | `TokenValidationScreen`        | Yes           | Yes                  | No             |
| `/select-account`           | `AccountSelectionScreen`       | Yes           | Yes                  | Yes            |
| `/manage-signers`           | `SignerManagementScreen`       | Yes           | Yes                  | Yes            |
| `/add-signer`               | `AddSignerScreen`              | Yes           | Yes                  | Yes            |
| `/edit-signer/:id`          | `EditSignerScreen`             | Yes           | Yes                  | Yes            |
| `/confirm-signers`          | `ConfirmSignersScreen`         | Yes           | Yes                  | Yes            |
| `/review-signers`           | `ReviewSignersScreen`          | Yes           | Yes                  | Yes            |
| `/submission-confirmation`  | `SubmissionConfirmationScreen` | Yes           | Yes                  | Yes            |
| `/error`                    | `ErrorScreen`                  | No            | No                   | No             |
| `*`                         | Redirect to `/`                | No            | No                   | No             |

---

## Security Headers Configuration

Security headers are configured in `vercel.json` and applied to all responses served by Vercel.

### Current Headers

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    },
    {
      "source": "/(.*).html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store"
        }
      ]
    }
  ]
}
```

### Header Descriptions

| Header                  | Value      | Purpose                                                                 |
|-------------------------|------------|-------------------------------------------------------------------------|
| `X-Content-Type-Options`| `nosniff`  | Prevents browsers from MIME-type sniffing, reducing XSS risk            |
| `X-Frame-Options`       | `DENY`     | Prevents the application from being embedded in iframes (clickjacking)  |
| `Cache-Control`         | `no-store` | Prevents caching of HTML files to ensure users always get the latest version |

### Recommended Additional Headers

For production deployments, consider adding the following headers to `vercel.json`:

```json
{
  "key": "Referrer-Policy",
  "value": "strict-origin-when-cross-origin"
},
{
  "key": "Permissions-Policy",
  "value": "camera=(), microphone=(), geolocation=()"
},
{
  "key": "Strict-Transport-Security",
  "value": "max-age=63072000; includeSubDomains; preload"
},
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
}
```

> **Note:** The `Content-Security-Policy` header above is a starting point. Adjust the directives based on your specific requirements. The `'unsafe-inline'` directive for `style-src` is required for Tailwind CSS utility classes.

---

## CI/CD Notes

### Automatic Deployments

Vercel automatically deploys on every push to the connected repository:

- **Production deployments**: Triggered by pushes to the `main` (or `master`) branch
- **Preview deployments**: Triggered by pushes to any other branch or pull request

### Build Pipeline

The Vercel build pipeline executes the following steps:

1. **Clone**: Clones the repository at the triggered commit
2. **Install**: Runs `npm install` to install dependencies
3. **Build**: Runs `npm run build` to generate the `dist/` output
4. **Deploy**: Uploads the `dist/` directory to Vercel's CDN

### Pre-Deployment Checks

Before merging to the production branch, ensure:

- [ ] All tests pass: `npm run test`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No new dependencies were added without updating `package.json`
- [ ] Environment variables are configured in Vercel for the target environment
- [ ] `vercel.json` is present and contains the SPA rewrite rule

### GitHub Actions Integration (Optional)

To add automated testing before Vercel deployment, create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Build
        run: npm run build
```

This workflow runs on every push and pull request to the `main` branch, ensuring code quality before Vercel deploys.

### Branch Protection (Recommended)

Configure branch protection rules on your `main` branch:

1. Require pull request reviews before merging
2. Require status checks to pass (CI workflow)
3. Require branches to be up to date before merging

### Rollback

If a deployment introduces issues:

1. Navigate to your project in the Vercel dashboard
2. Go to **Deployments**
3. Find the last known good deployment
4. Click the three-dot menu (⋯) → **"Promote to Production"**

This instantly rolls back to the selected deployment without requiring a new build.

---

## Troubleshooting

### Build Fails with Module Not Found

Ensure all imports use the `@/` alias which maps to `src/`:

```javascript
// Correct
import { classNames } from '@/utils/helpers';

// Incorrect
import { classNames } from '../../utils/helpers';
```

The alias is configured in `vite.config.js`:

```javascript
resolve: {
  alias: {
    '@': resolve(__dirname, 'src'),
  },
},
```

### 404 on Page Refresh

Verify that `vercel.json` is present in the project root and contains the SPA rewrite rule. The file must be committed to the repository.

### Environment Variables Not Available

- Ensure all variables are prefixed with `VITE_`
- Verify variables are set for the correct environment (Production/Preview/Development)
- Trigger a redeployment after adding or changing environment variables
- In the application, access variables via `import.meta.env.VITE_*`, never `process.env`

### Styles Not Loading

- Verify `src/index.css` contains the Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- Verify `postcss.config.js` includes `tailwindcss` and `autoprefixer` plugins
- Verify `tailwind.config.js` content paths include `"./src/**/*.{js,jsx,ts,tsx}"`
- Verify the Google Fonts link is present in `index.html`

### Tests Fail in CI but Pass Locally

- Ensure `vitest.config.js` includes the setup file: `setupFiles: ['./src/test/setup.js']`
- The test setup file provides a `localStorage` mock for the `jsdom` environment
- Verify the CI environment uses the same Node.js version as local development