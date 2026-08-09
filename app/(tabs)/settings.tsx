import { icons } from "@/constants/icons";
import images from "@/constants/images";
import { colors } from "@/constants/theme";
import "@/global.css";
import { formatAccountId, formatJoinedDate } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/expo";
import { clsx } from "clsx";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

const Settings = () => {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const posthog = usePostHog();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | undefined>();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError(undefined);
    try {
      await signOut();
      posthog.capture("sign_out_completed");
      posthog.reset();
    } catch {
      setSignOutError("Couldn't sign out. Check your connection and try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const avatarSource = user?.imageUrl ? { uri: user.imageUrl } : images.avatar;

  return (
    <SafeAreaView className="screen">
      <View className="screen-header">
        <Pressable
          className="screen-header-button"
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Image
            source={icons.back}
            className="screen-header-icon"
            resizeMode="contain"
            style={{ tintColor: colors.primary }}
          />
        </Pressable>

        <Text className="screen-header-title">Settings</Text>

        <View className="screen-header-spacer" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="screen-scroll-content"
      >
        {isLoaded ? (
          <>
            <View className="settings-profile-card">
              <Image source={avatarSource} className="settings-avatar" />
              <View className="settings-profile-copy">
                <Text className="settings-name" numberOfLines={1}>
                  {user?.fullName ?? user?.firstName ?? "Account"}
                </Text>
                <Text className="settings-email" numberOfLines={1}>
                  {user?.primaryEmailAddress?.emailAddress ?? "No email on file"}
                </Text>
              </View>
            </View>

            <View className="settings-info-card">
              <Text className="settings-info-title">Account</Text>
              <View className="settings-info-row">
                <Text className="settings-info-label">Account ID</Text>
                <Text className="settings-info-value">
                  {formatAccountId(user?.id ?? "")}
                </Text>
              </View>
              <View className="settings-info-row">
                <Text className="settings-info-label">Joined</Text>
                <Text className="settings-info-value">
                  {formatJoinedDate(user?.createdAt)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View className="settings-profile-card">
              <View className="settings-skeleton-block size-16 rounded-full" />
              <View className="settings-profile-copy gap-2">
                <View className="settings-skeleton-block h-4 w-32" />
                <View className="settings-skeleton-block h-3 w-40" />
              </View>
            </View>

            <View className="settings-info-card">
              <View className="settings-skeleton-block h-3 w-20" />
              <View className="settings-info-row">
                <View className="settings-skeleton-block h-4 w-24" />
                <View className="settings-skeleton-block h-4 w-32" />
              </View>
              <View className="settings-info-row">
                <View className="settings-skeleton-block h-4 w-16" />
                <View className="settings-skeleton-block h-4 w-24" />
              </View>
            </View>
          </>
        )}

        <View className="settings-info-card">
          <Text className="settings-info-title">App</Text>
          <View className="settings-info-row">
            <Text className="settings-info-label">Version</Text>
            <Text className="settings-info-value">{APP_VERSION}</Text>
          </View>
          <View className="settings-info-row">
            <Text className="settings-info-label">Subscription data</Text>
            <Text className="settings-info-value">Stored on this device</Text>
          </View>
        </View>

        {signOutError && (
          <Text className="auth-error mt-4 text-center">{signOutError}</Text>
        )}

        <Pressable
          className={clsx(
            "settings-signout",
            isSigningOut && "settings-signout-disabled",
          )}
          onPress={handleSignOut}
          disabled={isSigningOut}
          accessibilityRole="button"
        >
          {isSigningOut ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text className="settings-signout-text">Sign Out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
