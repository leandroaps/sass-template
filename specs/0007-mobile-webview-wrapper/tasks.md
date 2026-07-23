# Tasks — Mobile WebView Wrapper

- **Status:** Draft
- **Spec ID:** 0007
- **Implements:** design.md

Implement top-to-bottom. Each task is small, independently verifiable, and lists the
requirement IDs it satisfies.

- [ ] **T1** Resolve open questions in requirements.md (project location, target base
      URL, store-vs-internal distribution, push notifications confirmation) before
      starting implementation.
- [ ] **T2** Scaffold the Flutter project (`flutter create`), add `webview_flutter` and
      `url_launcher` to `pubspec.yaml`.
- [ ] **T3** `main.dart`: read `APP_BASE_URL` via `String.fromEnvironment`, fail loudly
      at startup if unset → R1.2
- [ ] **T4** `webview_screen.dart`: full-screen `WebViewWidget` loading the configured
      base URL, no browser chrome → R1.1
- [ ] **T5** Loading indicator while the initial page loads; error screen with a retry
      button on load failure (`NavigationDelegate.onPageStarted/onPageFinished/
onWebResourceError`) → R4.1, R4.2
- [ ] **T6** `PopScope`/back-button handling: step back through WebView history if
      `controller.canGoBack()`, otherwise fall through to platform default → R3.1, R3.2
- [ ] **T7** `NavigationDelegate.onNavigationRequest`: allow the configured base URL's
      host, hand any other host to `url_launcher` and cancel in-app navigation → R5.1
- [ ] **T8** Verify session persistence manually: sign in, force-close, relaunch, still
      signed in → R2.1, R2.2
- [ ] **T9** App icon + splash screen for Android and iOS (`flutter_launcher_icons` /
      `flutter_native_splash` or manual asset replacement) → R6.1
- [ ] **T10** `flutter test` widget tests for the host-allow-list check (T7) and the
      back-navigation-history check (T6) in isolation
- [ ] **T11** Manual verification pass on an Android emulator and an iOS simulator:
      R1, R3 (Android only), R4, R5, R6

## Done criteria

- [ ] All tasks checked.
- [ ] Every acceptance criterion in requirements.md verified (manually, per design.md's
      Testing strategy — this spec has no Playwright coverage).
- [ ] Spec updated to match what was actually built, including the resolved location
      of the Flutter project and the final decision on the alternatives considered in
      design.md §8.
