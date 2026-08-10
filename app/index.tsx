import { colors } from "@/constants/theme";
import { hasSeenOnboarding } from "@/lib/onboarding";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | undefined>();

  useEffect(() => {
    let active = true;
    hasSeenOnboarding().then((seen) => {
      if (active) setOnboardingSeen(seen);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!isLoaded || onboardingSeen === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isSignedIn) return <Redirect href="/(tabs)" />;

  // First run on this device gets the welcome screen; afterwards straight to sign-in.
  return <Redirect href={onboardingSeen ? "/(auth)/sign-in" : "/onboarding"} />;
}
