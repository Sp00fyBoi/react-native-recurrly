import "@/global.css";
import { Link } from "expo-router";
import { Text } from "react-native";
import { styled } from "nativewind"
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView)

export default function App() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background">
      <Text className="text-xl font-bold text-success">
        Welcome to Nativewind!
      </Text>
      <Link
        href="/onboarding"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Go to Onboarding
      </Link>

      <Link
        href="/(auth)/sign-in"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Go to SignIn
      </Link>

      <Link
        href="/(auth)/sign-up"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Go to SignUp
      </Link>

      <Link
        href="/subscriptions/spotify"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Go to Spotify Subscription
      </Link>

      <Link
        href={{
          pathname: "/subscriptions/[id]",
          params: { id: "calude" },
        }}
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Calude Max Subscription
      </Link>
    </SafeAreaView>
  );
}
