# Requirements — Mobile WebView Wrapper

- **Status:** Draft
- **Spec ID:** 0007
- **Author:**
- **Last updated:** 2026-07-22

## 1. Summary

Ships the existing web app as installable Android and iOS apps by wrapping the deployed
Next.js site in a Flutter WebView shell, so users can install a real app-icon/app-store
listing without writing any native Kotlin/Swift and without changing anything in the
Next.js app itself.

## 2. Goals

- A single Flutter project builds both an Android and an iOS app that load this app's
  deployed URL in a full-screen WebView.
- The wrapper points at a build-time-configurable base URL (so the same code builds a
  "point at localhost/staging" debug app and a "point at production" release app).
- An authenticated session survives an app restart (Better Auth's session cookie
  persists in the WebView's cookie store across launches).
- The Android hardware back button navigates WebView history instead of exiting the
  app when there's history to go back through.
- A broken/unreachable backend shows a retry screen instead of a blank white WebView.
- Links to a different origin than the app's own (e.g. a future "read our blog on
  medium.com" link) open in the system browser instead of loading inside the app.

## 3. Non-goals

- Any native functionality beyond what a WebView provides — no camera/push
  notifications/biometrics bridge in this spec.
- Offline support or local caching of app data.
- App Store / Play Store account setup, signing certificates, or the actual store
  submission — this spec covers the buildable app, not getting it published.
- Changes to the Next.js app itself — this is purely a new, separate client.
- CI/CD automation for mobile builds — out of scope until the wrapper exists and is
  validated manually.

## 4. User stories & acceptance criteria

Use EARS notation (WHEN/IF/THEN SHALL). Number every requirement so tasks can
reference it.

### R1 — Load the web app in a WebView shell

> As a user, I want to open the app from my home screen icon, so that I can use the product like any other installed app.

- **R1.1** WHEN the app launches, the system SHALL load a single configurable base URL
  in a full-screen WebView with no browser chrome (no address bar).
- **R1.2** the base URL SHALL be set at build time (not hardcoded), so debug builds can
  point at a local/staging server and release builds at production without a code
  change.

### R2 — Session persists across restarts

> As a signed-in user, I want to stay signed in after closing and reopening the app, so that I don't have to log in every time.

- **R2.1** WHEN a user signs in inside the WebView, the system SHALL persist the
  resulting session cookie in the platform's persistent cookie store.
- **R2.2** WHEN the app is closed and reopened, the system SHALL still be signed in if
  the session hasn't expired server-side.

### R3 — Native back-button behavior

> As an Android user, I want the hardware/gesture back button to go back a page inside the app, so that navigation feels native instead of exiting unexpectedly.

- **R3.1** WHEN the back button/gesture is triggered AND the WebView has in-app
  navigation history, the system SHALL navigate back within the WebView instead of
  closing the app.
- **R3.2** WHEN the back button/gesture is triggered AND the WebView has no in-app
  navigation history, the system SHALL fall back to the platform default (exit/
  background the app).

### R4 — Resilient loading and error state

> As a user on a flaky connection or when the backend is down, I want a clear retry screen instead of a blank page, so that I know what happened and can recover.

- **R4.1** WHILE the initial page is loading, the system SHALL show a loading
  indicator instead of a blank white screen.
- **R4.2** IF the page fails to load (network error or non-2xx from the base URL),
  THEN the system SHALL show an error state with a retry action instead of a blank or
  browser-native error page.

### R5 — External links leave the app

> As a user tapping a link to an external site, I want it to open in my regular browser, so the app doesn't trap me on a page it wasn't meant to host.

- **R5.1** WHEN a navigation inside the WebView targets a host other than the
  configured base URL's host, the system SHALL open that URL in the system's default
  browser instead of loading it in-app.

### R6 — App identity

> As a user browsing the app store, I want a real app icon, name, and splash screen, so it looks like a finished product rather than a placeholder.

- **R6.1** the system SHALL ship a custom app icon and launch/splash screen for both
  Android and iOS (not the Flutter default icon).

## 5. Constraints & assumptions

- Flutter avoids writing native Kotlin/Swift, but it does **not** avoid needing each
  platform's build toolchain: an Android build needs the Android SDK/build-tools
  (installed automatically by `flutter build apk`, no manual Android Studio setup
  required), and an **iOS build still requires a Mac with Xcode installed** to compile
  and sign — that's an Apple platform requirement independent of Flutter, not something
  any wrapper approach can bypass. This spec assumes such a Mac (or a CI mac runner) is
  available when the iOS build is actually produced.
- No changes to the Next.js app (`src/**`) are required for this spec — the wrapper
  consumes the app exactly as a normal browser would, over its already-public URL.
- Better Auth's session is a standard `httpOnly` cookie (`src/lib/auth.ts`); no custom
  token-passing scheme is assumed or needed.
- This is a new, separate codebase (a Flutter project) alongside the existing Next.js
  repo — it does not fit the existing `backend`/`frontend`/`test` teammate skills in
  `.claude/agents/`, which are scoped to this repo's Next.js/Drizzle stack. Where this
  work lives (new top-level directory in this repo vs. a separate repo) and who
  implements it is an open question for the implementation plan, not decided by this
  spec.
- Apple App Store review (guideline 4.2, "Minimum Functionality") can reject apps that
  are judged to be "a website wrapped in a WebView" with no native value-add. This is a
  distribution risk to flag before investing in an App Store submission, not something
  this spec can engineer around.

## 6. Open questions

- [ ] Where does the Flutter project live — a new top-level directory in this repo
      (e.g. `mobile/`), or a separate repository?
- [ ] Which base URL does the release build point at — is production already deployed
      somewhere reachable from a mobile network, or does that deployment need to happen
      first?
- [ ] Is App Store / Play Store distribution actually the goal, or is internal
      distribution (APK sideload, TestFlight/ad hoc) enough for now? Affects how much the
      4.2 rejection risk above matters.
- [ ] Push notifications are explicitly non-goal here — confirm that's fine for v1.
