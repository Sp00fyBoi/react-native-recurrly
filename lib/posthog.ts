import PostHog from "posthog-react-native";

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

// Warn rather than throw: this module is imported by the root layout, so an
// import-time throw crashes the app before any UI or error boundary exists.
// The `disabled` flag below already makes a missing token a safe no-op.
if (__DEV__) {
  if (!projectToken) {
    console.warn(
      "EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN is missing. Analytics are disabled and events will be dropped until it is configured.",
    );
  }
  if (!host) {
    console.warn(
      "EXPO_PUBLIC_POSTHOG_HOST is missing. Analytics are disabled and events will be dropped until it is configured.",
    );
  }
}

export const posthog = new PostHog(projectToken || "phc_unconfigured", {
  host: host || "https://us.i.posthog.com",
  disabled: !projectToken || !host,
  captureAppLifecycleEvents: true,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
    },
  },
});
