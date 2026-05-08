# Changelog

All notable changes to the Signature Card Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-02-25

### Added

#### Welcome & Onboarding
- Welcome screen with content-managed informational content from `welcomeContent.json`
- Process overview steps with iconography (Verify Identity, Select Account, Manage Signers, Review & Submit)
- Estimated time display and legal disclaimer
- eSign token capture from URL query parameters via `TokenService.captureToken`
- Prominent "Get Started" call-to-action button to begin the workflow

#### Authentication & Session Management
- Secure login screen with username and password fields
- Floating label pattern on form inputs via `FormField` component
- Show/hide password toggle with accessible labeling
- Real-time inline field validation on blur and submit
- Rate-limited login attempts with configurable maximum (default: 5 attempts)
- Account lockout after exceeding maximum failed login attempts
- Attempt-remaining warnings sourced from `messages.json`
- Session creation with configurable timeout (default: 15 minutes)
- Session activity tracking with automatic expiration
- Session timeout warning modal with countdown timer (default: warning at 13 minutes)
- Automatic session termination and redirect on expiry
- Session refresh on meaningful user interactions

#### Identity Verification (OTP)
- OTP delivery method selection (email or SMS) with masked contact information
- 6-digit one-time passcode input with numeric keyboard support
- OTP expiry timer with configurable duration (default: 300 seconds)
- Resend OTP with cooldown period (60 seconds between resends)
- Configurable maximum OTP resend attempts (default: 3 per session)
- Configurable maximum OTP verification attempts (default: 3 per session)
- Session termination after exhausting all verification attempts
- Audit logging for OTP send, verify, and failure events

#### eSign Token Validation
- Automatic token validation on mount via `TokenService.validateToken`
- Token existence, expiration, and user association checks
- Configurable token expiry duration (default: 72 hours)
- Token status transitions (pending → confirmed, pending → expired)
- Descriptive error messages for expired, invalid, and unauthorized tokens
- Retry capability for non-expired token validation failures
- Automatic redirect to account selection on successful validation

#### Account Selection
- Account list display with `AccountCard` components
- Masked account numbers via `maskAccountNumber` utility
- Account type badges (Checking, Savings, Money Market)
- Signer count display per account
- Keyboard navigation with arrow keys within the account list
- Auto-select and proceed when only one account exists
- Pagination for large account lists (6 accounts per page)
- `role="listbox"` and `aria-selected` for accessible selection

#### Signer Management
- Consolidated signer list with `SignerCard` components
- Status badges for Active, Pending, Locked, and Removed signers
- Masked email and phone number display
- Search by signer name (first name, last name, full name)
- Filter by status (All, Active, Pending, Locked)
- Sort options (Name A–Z, Name Z–A, Status, Date Added)
- Pagination for large signer lists (6 signers per page)
- Total signer count and showing count display

#### Add Signer
- `SignerForm` component with real-time inline validation
- Required fields: First Name, Last Name, Title, Role, Email, Phone
- Optional fields: Middle Name, Suffix, Additional Contact Information
- Name validation (letters, hyphens, apostrophes, spaces; 2–50 characters)
- Email format validation
- Phone number validation (10 digits, formatting characters accepted)
- Duplicate signer detection on the same account
- New signers created with Pending status and invitation record
- Support for adding multiple signers before returning to management
- Success confirmation with "Add Another" and "Return to Management" options

#### Edit Signer
- `SignerForm` pre-populated with existing signer data
- Before/after change tracking for all editable fields
- Validation of updated fields with same rules as add flow
- Prevention of editing removed signers
- Automatic navigation back to signer management after save

#### Remove Signer
- `RemoveSignerModal` confirmation dialog with signer name
- Prevention of removing the last signer on an account
- Critical alert when attempting to remove the last signer
- Signer status set to Removed on confirmation
- Removed signers excluded from default list but available with `includeRemoved` flag

#### Self-Service Unlock
- `UnlockSignerButton` component for locked signers
- Rate-limited unlock attempts (default: 3 per day per signer)
- Attempt-based messaging (Attempt 1, Attempt 2, Final Attempt, Exhausted)
- Confirmation modal with attempt information and remaining count
- Daily rate limit reset at midnight (calendar day boundary)
- Signer status transition from Locked to Active on success
- Audit logging for all unlock attempts (success and failure)

#### Resend Invitation
- `ResendInvitationButton` component for pending signers
- Rate-limited resend attempts (default: 3 per day per signer)
- Attempt-based messaging sourced from `messages.json`
- Confirmation modal with attempt information and remaining count
- Daily rate limit reset at midnight (calendar day boundary)
- Invitation timestamp update on successful resend
- Audit logging for all resend attempts (success and failure)

#### Confirmation & Review Workflow
- Confirm Signers screen with `ChangesSummary` component
- Grouped display of additions (green), edits (amber), and removals (red)
- Before/after field comparison for edited signers
- Count badges per change type with total changes summary
- Review Signers screen with complete signer list and change status indicators
- Change status badges: New, Modified, Removed, Unchanged
- Color-coded signer cards based on change status
- Account details card with account name, number, type, and controlling party
- `LegalConsent` checkbox with full legal disclaimer text
- Legal consent required before submission is enabled
- "Edit Signers" button to return to signer management for further changes

#### Submission & Confirmation
- `SubmissionService.submitChanges` with confirmation number generation
- Idempotency check to prevent duplicate submissions
- Submission lock mechanism with 5-minute timeout
- Reference ID / confirmation number display (format: SCM-YYYYMMDD-XXXXXX)
- Submission timestamp display
- Submission details card (account info, reference ID, timestamp, submitted by)
- Changes submitted summary with count badges
- "What Happens Next?" informational section
- Confirmation notification display
- "Done" button to clear all state and return to welcome screen

#### Audit Logging
- Core `AuditService` with immutable append-only audit log
- Extended `AuditLogService` for signer management events
- Supported event types: Login Success/Failure, Logout, Session Expired, OTP Sent/Verified/Failed, Token Validated/Invalid
- Signer event types: Signer Added/Edited/Removed/Unlocked, Invitation Resent, Submission Completed
- Automatic PII masking in audit details (email, phone, SSN, account number, names)
- Before/after state tracking for edit and remove operations
- Filterable audit logs by user, action type, account, signer, date range, and reference ID
- Timestamp and unique event ID on every audit entry

#### Navigation & Progress
- Step-based `ProgressIndicator` with completed/active/upcoming states
- Horizontal layout on desktop, vertical on mobile
- `NavigationContext` with step ordering enforcement
- Forward navigation restricted to next uncompleted step
- Backward navigation allowed to any prior step
- Navigation state persistence in localStorage and session
- `PageLayout` component with consistent page structure
- Configurable header (title, subtitle, custom content)
- Configurable footer (Back, Continue, Cancel buttons)
- `ExitConfirmationModal` when cancelling with unsaved changes

#### Error Handling
- `ErrorBoundary` class component at application root
- `ErrorScreen` page with configurable error types
- Supported error types: Token Expired, Token Invalid, Session Expired, Unauthorized, Network Error, Server Error, Generic
- Contextual error icons and descriptive messages
- Retry and Return to Home action buttons
- Additional instructions based on error type
- Alert component with Critical, Warning, Success, and Info variants
- Dismissible alerts with accessible close button

#### Accessibility (WCAG 2.1 AA)
- Semantic HTML with proper heading hierarchy
- ARIA attributes: `role`, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-live`, `aria-atomic`, `aria-invalid`, `aria-required`, `aria-selected`, `aria-disabled`, `aria-current`, `aria-checked`, `aria-modal`
- Focus management: auto-focus on modals, focus trapping in dialogs, focus restoration on close
- Keyboard navigation: Enter/Space activation, Tab/Shift+Tab focus cycling, Escape to close modals, Arrow keys for list navigation
- Screen reader announcements via `aria-live="assertive"` and `aria-live="polite"` regions
- Visible focus indicators with `focus:ring-2 focus:ring-primary-blue focus:ring-offset-2`
- Color contrast compliant text and interactive elements
- Form validation errors linked via `aria-describedby`
- Skip navigation support via semantic landmarks (`role="main"`, `role="search"`, `role="navigation"`)

#### Responsive Design
- Mobile-first approach with Tailwind CSS breakpoints
- Custom breakpoints: mobile (320px), tablet (640px), desktop (1024px), widescreen (1200px)
- Fluid wrapper with max-width 1200px and horizontal padding
- Responsive grid layouts for process steps and form fields
- Stacked layouts on mobile, side-by-side on tablet and desktop
- Responsive pagination with hidden text labels on mobile

#### UI Components
- `Button` component with Primary, Secondary, Danger, and Link variants
- Loading spinner state on buttons with `aria-busy`
- `FormField` component with floating label pattern
- Password visibility toggle
- `Modal` component with focus trapping, Escape key, and backdrop click
- `AccountCard` with selectable state and keyboard interaction
- `SignerCard` with contextual action buttons
- `FilterSort` with search, status filter, and sort controls
- `Pagination` with page numbers, ellipsis, and previous/next buttons
- `ChangesSummary` with grouped additions, edits, and removals
- `LegalConsent` with scrollable legal text and checkbox
- `Alert` with variant-based styling and optional dismiss

#### Mock Data & Configuration
- User fixtures with credentials, profiles, and account associations (`users.json`)
- Account fixtures with types, masked numbers, and signer counts (`accounts.json`)
- Signer fixtures with mixed statuses and invitation records (`signers.json`)
- Token fixtures with pending, confirmed, and expired states (`tokens.json`)
- Content-managed messages for errors, success, session, validation, and confirmation (`messages.json`)
- Welcome screen content with process steps and legal disclaimer (`welcomeContent.json`)
- Environment variable configuration via `.env` for session timeout, OTP expiry, token expiry, and rate limits

#### Testing
- Unit tests for `AuthService` (login, logout, lockout, audit logging)
- Unit tests for `VerificationService` (OTP send, verify, cooldown, session termination)
- Unit tests for `SignerService` (CRUD operations, staged changes, unlock, resend)
- Unit tests for `RateLimitService` (daily limits, reset, independent tracking)
- Unit tests for validators (email, phone, name, OTP, password, signer form)
- Integration tests for `LoginScreen` (rendering, validation, lockout, audit, accessibility)
- Integration tests for `SignerManagementScreen` (rendering, filtering, sorting, actions, accessibility)
- Test setup with localStorage mock and `@testing-library/jest-dom` matchers