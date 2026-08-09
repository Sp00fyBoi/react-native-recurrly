import images from "@/constants/images";
import "@/global.css";
import { markOnboardingSeen } from "@/lib/onboarding";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Onboarding = () => {
  const router = useRouter();
  const posthog = usePostHog();

  const handleGetStarted = async () => {
    posthog.capture("onboarding_completed");
    // Mark first so a failed write can't trap the user on this screen forever.
    await markOnboardingSeen();
    router.replace("/(auth)/sign-up");
  };

  return (
    <SafeAreaView className="onboarding-screen" edges={["top", "bottom"]}>
      <View className="onboarding-pattern-wrap">
        <Image
          source={images.splashPattern}
          className="onboarding-pattern"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>

      <View className="onboarding-copy">
        <Text className="onboarding-title">Gain Financial Clarity</Text>
        <Text className="onboarding-subtitle">
          Track, analyze and cancel with ease
        </Text>

        <Pressable
          className="onboarding-button"
          onPress={handleGetStarted}
          accessibilityRole="button"
        >
          <Text className="onboarding-button-text">Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Onboarding;
