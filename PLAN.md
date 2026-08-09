# Recurrly — Codebase Audit & Remediation Plan

## Context

A read-only audit of the full Expo SDK 54 / Expo Router 6 codebase (19 source files across `app/`, `components/`, `lib/`, `constants/`) was requested to find broken features, runtime hazards, and unimplemented functionality before further feature work. Styling/theme is finalised and out of scope except where a dead class reference breaks layout.

**Baseline verified during the audit:**
- `npx tsc --noEmit` → **0 errors in app source** (33 errors all originate from the gitignored `app-example/` scaffold).
- `npx expo lint` → **clean, no warnings**.
- `grep TODO|FIXME|HACK|XXX` across all source → **zero hits**.
- Zero `fetch`/`axios`/network calls exist anywhere in the app.

The problems are therefore not type or lint problems — they are missing error paths, dead references, mock data standing in for logic, and a build-tooling leak.

---

## 1. 🔴 Critical Bugs & Broken Features

### C1 — Font-load failure permanently hangs the app on the splash screen
`app/_layout.tsx:31-46`

`useFonts` returns `[loaded, error]`; the error element is discarded. `SplashScreen.hideAsync()` fires only inside `if (fontsLoaded)`, and the component returns `null` while loading. If any of the six `PlusJakartaSans-*.ttf` files fails to load, `fontsLoaded` stays `false` forever → splash never hides, no timeout, no fallback, no way out. Additionally `SplashScreen.preventAutoHideAsync()` (line 22) and `hideAsync()` (line 42) are floating promises with no `.catch()`.

**Fix:** destructure the error (`const [fontsLoaded, fontError] = useFonts(...)`), render once `fontsLoaded || fontError`, and attach `.catch()` to both SplashScreen calls.

### C2 — Module-scope `throw` crashes before any UI or error boundary exists
`lib/posthog.ts:6-16`, `app/_layout.tsx:24-28`

Three top-level `throw`s run at import time. On a fresh clone without `.env`, the app dies with a raw red box instead of an actionable message. Note `app/_layout.tsx:24` uses a `!` non-null assertion, so the `if (!publishableKey)` guard immediately below is dead code to the type checker — TypeScript can never help here.

**Fix:** drop the `!`, and surface missing config as rendered UI (or a `console.error` + degraded mode) rather than an import-time throw. PostHog already has a `disabled` flag (`lib/posthog.ts:20`) doing exactly this correctly — the throws above it are redundant.

### C3 — No error handling on any async flow in the app
`app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`, `app/(tabs)/settings.tsx`

15 `await` expressions across `app/` and `components/`. The **only** `catch` block in the entire repository is `lib/utils.ts:11`. Every auth handler passes a rejecting promise straight to `onPress`:

- `handleSignIn` / `handleVerify` / `handleResend` / `finalizeSession` — `sign-in.tsx:78-166`
- `handleSignUp` / `handleVerify` / `handleResend` — `sign-up.tsx:86-155`
- `handleSignOut` — `settings.tsx:20-30`

The code checks Clerk's returned `{ error }` object but nothing catches a thrown rejection (network drop, timeout, DNS failure). Result: unhandled promise rejection (silently swallowed into PostHog via `errorTracking.autocapture.unhandledRejections`), **no user-visible error**, spinner stops, button re-enables — the user taps "Sign in" and nothing at all happens.

Sub-case: `handleUseDifferentAccount` (`sign-in.tsx:168-178`) and `handleUseDifferentEmail` (`sign-up.tsx:157-167`) use `try { await … } finally { … }` with **no `catch`**. `finally` does not swallow a rejection — it still escapes.

**Fix:** wrap each handler body in `try/catch`, set the existing `statusNotice` state on failure (the render path for it already exists), and keep the `finally` blocks for spinner reset.

### C4 — `.claude/worktrees/` is not gitignored, so Expo Router is scanning it as routes
`.gitignore`, verified against `.expo/types/router.d.ts` (regenerated today 17:16)

The generated typed-routes file registers ~40 phantom routes, including:
```
/../.claude/worktrees/android-keyboard-modal-fix/app/modal-preview
/../.claude/worktrees/sprightly-growing-eagle/app/(tabs)/settings
/../lib/subscriptions-store
```
`app-example/` is *correctly* excluded because it appears in `.gitignore:43` — which confirms the mechanism: Expo's file scan respects gitignore, and the worktrees aren't listed. Two complete duplicate copies of the app are being watched by Metro and enrolled in the router.

Consequences: phantom deep-linkable routes (incl. the leftover `modal-preview` test screen), duplicate module trees, slower bundling, and unusable typed-route autocomplete.

**Fix:** add `.claude/worktrees/` to `.gitignore`, delete `.expo/types/router.d.ts` to force regeneration, and restart Metro with `--clear`.

### C5 — Android: create-subscription modal keyboard covers the form
`components/CreateSubscriptionModal.tsx:125-136`, `app.json:21`

`edgeToEdgeEnabled: true` is set. On Android, `Modal` renders in a **separate native Dialog window** that never receives the activity's `adjustResize` events, so the `KeyboardAvoidingView behavior="height"` inside it gets no keyboard height and the soft keyboard covers the Name and Price inputs. The `Modal` also lacks `statusBarTranslucent` / `navigationBarTranslucent`, so the overlay does not cover the system bars under edge-to-edge.

A working fix (a `useAndroidKeyboardHeight` hook driven by `Keyboard.addListener('keyboardDidShow'/'keyboardDidHide')` applying `marginBottom`, plus `statusBarTranslucent`) exists **only** in `.claude/worktrees/android-keyboard-modal-fix/components/CreateSubscriptionModal.tsx` — it was never brought into the main tree.

**Fix:** port the hook and the `Modal` props from that worktree into `components/CreateSubscriptionModal.tsx`.

---

## 2. 🟡 Warnings & Functional Gaps

### W1 — Two dead CSS class references (broken layout, not aesthetics)
| Used in code | Defined in `global.css` | Effect |
|---|---|---|
| `sub-bdy` — `components/SubscriptionCard.tsx:56` | `.sub-body` (line 189, `@apply mt-6 gap-4`) | Expanded card details render flush against the header with no spacing |
| `list-action-test` — `components/ListHeading.tsx:9` | `.list-action-text` (line 117, `@apply text-lg font-sans-semibold text-primary`) | "View all" renders as unstyled default text inside the styled pill |

Both are typos resolving to nothing. Fix the two call sites, not the CSS.

### W2 — "View all" button is dead
`components/ListHeading.tsx:8-10` — `TouchableOpacity` with no `onPress`. It renders on both Home headings ("Upcoming" and "All Subscriptions") and does nothing when tapped.

### W3 — Submit-time validation in the create modal is unreachable
`components/CreateSubscriptionModal.tsx:73, 279` — the button is `disabled={!isValid}`, so the `handleSubmit` branch at lines 92-95 that populates `formErrors` **can never execute**. A user with an empty form sees only a dimmed button with no explanation until they focus and blur each field individually.

**Fix:** either enable the button and let `handleSubmit` surface the errors, or add helper text explaining what's required.

### W4 — `ListHeaderComponent` passed as an inline function on Home
`app/(tabs)/index.tsx:66` — passing an arrow function creates a new component identity on every render, so React remounts the entire header subtree (avatar image, balance card, horizontal upcoming list) on each state change. `app/(tabs)/subscriptions.tsx:91` already does this correctly by passing a JSX **element**. Make Home match.

### W5 — All subscription state is in-memory only
`lib/subscriptions-store.tsx:24-25` seeds from `HOME_SUBSCRIPTIONS` into `useState`. Every subscription the user creates is **lost on app restart**, and the provider lives inside `app/(tabs)/_layout.tsx:33` so it also unmounts on sign-out. `expo-secure-store` is installed but used only by Clerk's token cache.

### W6 — Home balance and "Upcoming" are static mocks that ignore real data
`app/(tabs)/index.tsx:88-91, 100`

- Balance renders hardcoded `HOME_BALANCE.amount` = `2489.48`; adding subscriptions never changes it.
- `HOME_BALANCE.nextRenewalDate` = `2026-03-18`, already ~5 months in the past (today: 2026-08-09).
- "Upcoming" maps three hardcoded entries from `UPCOMING_SUBSCRIPTIONS`; `UpcomingSubscriptionCard` renders a hardcoded `daysLeft` integer instead of deriving it from a renewal date, so the countdown never moves.

The `ListEmptyComponent` on the upcoming list (line 107) is therefore also unreachable.

### W7 — No error boundary
`app/_layout.tsx` doesn't export an `ErrorBoundary`. Any render-time throw crashes to a red screen — including `useSubscriptions`' own `throw` (`lib/subscriptions-store.tsx:46`) if a consumer ever mounts outside the tabs tree.

### W8 — `Insights` is a stub but ships as a first-class tab
`app/(tabs)/insights.tsx` renders the literal string "Insights". It is reachable from the tab bar (`constants/data.ts:6`), so users hit an empty screen.

### W9 — Two orphan routes, both unstyled placeholders
- `app/onboarding.tsx` — bare `View`/`Text`, no `SafeAreaView`, so content renders under the status bar. Nothing navigates to it.
- `app/subscriptions/[id].tsx` — same problem, plus a misspelled component name (`SubsciptionDetails`) and `<Link href="/">Go Back</Link>` which routes through `app/index.tsx`'s auth gate rather than actually going back.

Verified against every navigation call in the app — only `router.replace("/(tabs)")`, `Redirect` to `/(tabs)` or `/(auth)/sign-in`, and `Link` between sign-in/sign-up exist. `SubscriptionCard`'s `onPress` only toggles expansion, so the detail route is unreachable by design.

### W10 — Sign-out failure is invisible
`app/(tabs)/settings.tsx:20-30` — on failure the spinner simply stops; `posthog.capture`/`posthog.reset` are skipped and the user is left signed in with no message.

---

## 3. 🔵 Missing & Unimplemented Features

| # | Gap | Evidence |
|---|---|---|
| F1 | **No cancel / delete / edit subscription.** `onCancelPress` and `isCancelling` are declared props (`type.d.ts:35-36`) and `.sub-cancel`, `.sub-cancel-disabled`, `.sub-cancel-text` exist in `global.css:213-223` — but `SubscriptionCard.tsx` never renders the button. Fully-built UI contract with no implementation. |
| F2 | **No backend at all.** Zero `fetch`/`axios` calls in the codebase. README advertises Node/Express/MongoDB persistence, scheduled email renewal reminders, and monetization — none exists here. |
| F3 | **No forgot-password / reset flow** on sign-in. |
| F4 | **No OAuth / social sign-in.** `expo-web-browser` is installed and entirely unused. |
| F5 | **New subscriptions always get `icons.wallet`** (`CreateSubscriptionModal.tsx:107`) — no icon picker and no name-matching against the 12 brand icons already in `constants/icons.ts`. |
| F6 | **Currency hardcoded to `"USD"`** (`CreateSubscriptionModal.tsx:113`) despite `formatCurrency` (`lib/utils.ts:3`) accepting any code. |
| F7 | **Status hardcoded to `"active"`** on creation (`CreateSubscriptionModal.tsx:110`); nothing can move a subscription to `paused`/`cancelled`, though seed data and `formatStatusLabel` support all three. |
| F8 | **Sign-up dead end:** if `signUp.password()` succeeds but `verifications.sendEmailCode()` fails (`sign-up.tsx:96-97`), the user is stranded on the form stage with an account already created and no resend path. |
| F9 | **`statusNotice` never rendered on the sign-up form stage** (`sign-up.tsx:215` shows only `globalError`), inconsistent with sign-in which shows both (`sign-in.tsx:226`). |
| F10 | **`npm run reset-project` is broken** — `package.json:7` points at `./scripts/reset-project.js`; the `scripts/` directory does not exist. |
| F11 | **`app-example/` is 67 KB of dead scaffold** producing all 33 `tsc --noEmit` errors. Gitignored (so it never reaches the bundler) but it destroys the typecheck signal. |
| F12 | **10 unused dependencies** — `react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg`, `expo-haptics`, `expo-image`, `expo-symbols`, `expo-linking`, `expo-system-ui`, `@expo/vector-icons`, `expo-constants`. Zero imports in app source. Note `expo-image` is unused while RN's `Image` is used everywhere. |

**No `TODO`, `FIXME`, `HACK`, or `XXX` comments exist anywhere in the codebase** — verified across all `.ts`/`.tsx`/`.js`/`.json`/`.css` files.

---

## 4. 🚀 Recommended Action Plan

### Phase 1 — Stop the bleeding (fast, low-risk, high-value)
1. **C4** — add `.claude/worktrees/` to `.gitignore`, delete `.expo/types/router.d.ts`, restart Metro with `--clear`. *One line; removes 40 phantom routes and fixes typed-route autocomplete for everything after.*
2. **W1** — fix `sub-bdy` → `sub-body` and `list-action-test` → `list-action-text`. *Two characters; restores expanded-card and "View all" layout.*
3. **C1** — capture the `useFonts` error and add `.catch()` to both SplashScreen calls. *Removes the permanent-hang failure mode.*
4. **F11** — delete `app-example/` and either restore `scripts/reset-project.js` or drop the script from `package.json` (**F10**). *`tsc --noEmit` becomes a trustworthy gate.*

### Phase 2 — Make failures visible (the biggest real-user risk)
5. **C3** — add `try/catch` to all seven async auth handlers plus `handleSignOut`; route failures into the existing `statusNotice` state. Render `statusNotice` on the sign-up form stage too (**F9**).
6. **C2** — remove the `!` assertion, replace import-time throws with rendered configuration errors.
7. **W7** — export an `ErrorBoundary` from `app/_layout.tsx`.
8. **W10** — surface sign-out failures in Settings.

### Phase 3 — Android correctness
9. **C5** — port `useAndroidKeyboardHeight` + `statusBarTranslucent` from `.claude/worktrees/android-keyboard-modal-fix/components/CreateSubscriptionModal.tsx` into the main component. Verify on the connected device (SM_S921B) with Metro hot reload — no rebuild needed.
10. **W3** — make create-modal validation reachable (enable the button, let `handleSubmit` report).

### Phase 4 — Make the data real
11. **W5** — persist subscriptions. Hoist `SubscriptionsProvider` above the tabs (into `app/_layout.tsx`) and back it with AsyncStorage or SQLite so state survives restart.
12. **W6** — derive the balance from `subscriptions` (sum of monthly-normalised prices) and derive "Upcoming" from `renewalDate` via `dayjs().diff()` instead of hardcoded `daysLeft`. Removes both mock constants.
13. **W4** — convert Home's `ListHeaderComponent` to an element.
14. **F1** — render the cancel button in `SubscriptionCard` using the props and CSS that already exist; add `removeSubscription`/`updateSubscription` to the store (**F7**).

### Phase 5 — Fill the feature gaps
15. **W8** — build Insights on top of the now-real subscription data (spend by category, monthly totals).
16. **W9** — either implement `onboarding` and `subscriptions/[id]` (wire the detail route to `SubscriptionCard`'s press with a long-press or chevron) or delete both files.
17. **F5 / F6** — icon picker and currency selector in the create modal.
18. **F3 / F4** — forgot-password and OAuth via Clerk.
19. **F8** — resend path when the sign-up code send fails.
20. **F12** — prune unused dependencies (verify each against native config before removing; `react-native-reanimated` and `react-native-gesture-handler` may be required transitively by `expo-router`/`react-native-screens`).
21. **F2** — backend integration, if the README's stated architecture is still the goal.

---

## Verification

- `npx tsc --noEmit` → expect **0 errors** once `app-example/` is removed (app source is already clean).
- `npx expo lint` → must stay clean.
- `ls .expo/types/router.d.ts` after a `--clear` restart → must contain **no** `.claude/worktrees` or `/../lib/` entries.
- On the connected Android device: open the create modal, focus **Price**, confirm the field stays visible above the keyboard; submit an empty form and confirm validation messages appear.
- Airplane-mode test: tap "Sign in" and confirm a visible error message rather than silence.
- Create a subscription, force-quit, relaunch → it must still be listed, and the Home balance must include it.
