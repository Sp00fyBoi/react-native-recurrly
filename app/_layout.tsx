import "@/global.css";
import { ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { SubscriptionsProvider } from "@/lib/subscriptions-store";
import { useFonts } from "expo-font";
import {
  SplashScreen,
  Stack,
  usePathname,
  type ErrorBoundaryProps,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { posthog } from "@/lib/posthog";

function ScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();

  useEffect(() => {
    posthog.screen(pathname);
  }, [posthog, pathname]);

  return null;
}

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden (fast refresh, warm start). Non-fatal.
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Rendered instead of crashing at import time when required config is absent. */
function ConfigurationError({ variable }: { variable: string }) {
  return (
    <View className="auth-safe-area justify-center p-5">
      <StatusBar style="dark" />
      <Text className="auth-title">Configuration required</Text>
      <Text className="auth-subtitle">
        {variable} is missing. Add it to your .env file and restart the app.
      </Text>
    </View>
  );
}

/**
 * Provides the subscriptions store to every signed-in route — including
 * `/subscriptions/[id]`, which lives outside the tabs group and would
 * otherwise hit `useSubscriptions()`'s "must be used within a provider" throw.
 * Signed-out routes render without it since they have no user to scope to.
 */
function SignedInProviders({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  // `undefined` while Clerk is still resolving, `null` once it has confirmed
  // signed-out, and the Clerk user id once signed in — the store uses this to
  // tell "still loading" apart from "confirmed no user".
  const userId = !isLoaded ? undefined : isSignedIn && user ? user.id : null;

  // Always rendered, even signed out, so the element type at this position
  // never changes — swapping it would remount the whole navigation Stack the
  // moment auth state flips.
  return (
    <SubscriptionsProvider userId={userId}>{children}</SubscriptionsProvider>
  );
}

/**
 * Expo Router renders this in place of the tree when a descendant throws,
 * so a render error surfaces as a recoverable screen instead of a crash.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="auth-safe-area justify-center p-5">
      <StatusBar style="dark" />
      <Text className="auth-title">Something went wrong</Text>
      <Text className="auth-subtitle">
        The app hit an unexpected error. You can try again.
      </Text>
      {/* Raw messages can carry internals (paths, ids, query fragments), so
          they stay in development builds only. */}
      <ScrollView className="max-h-40 my-4">
        <Text className="auth-error">
          {__DEV__
            ? error.message
            : "If this keeps happening, please contact support."}
        </Text>
      </ScrollView>
      <Pressable
        className="auth-button"
        onPress={() => retry()}
        accessibilityRole="button"
      >
        <Text className="auth-button-text">Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  // Render on font failure too, otherwise a single bad asset leaves the app
  // stuck behind the splash screen forever with no way out.
  const isReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        // Already hidden; nothing to recover from.
      });
    }
  }, [isReady]);

  if (!isReady) return null;

  if (!publishableKey) {
    return (
      <ConfigurationError variable="EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" />
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
        {/* Every surface in the app is cream, so system icons must be dark.
            Under Android edge-to-edge only `style` is honoured — a
            backgroundColor here would be ignored with a warning. */}
        <StatusBar style="dark" />
        <ScreenTracker />
        <SignedInProviders>
          <Stack screenOptions={{ headerShown: false }} />
        </SignedInProviders>
      </PostHogProvider>
    </ClerkProvider>
  );
}
