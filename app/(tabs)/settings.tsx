import images from "@/constants/images";
import { colors } from "@/constants/theme";
import { formatAccountId, formatJoinedDate } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/expo";
import { clsx } from "clsx";
import { styled } from "nativewind";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const avatarSource = user?.imageUrl ? { uri: user.imageUrl } : images.avatar;

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="list-title mb-6">Settings</Text>

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

      <Pressable
        className={clsx("settings-signout", isSigningOut && "settings-signout-disabled")}
        onPress={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text className="settings-signout-text">Sign Out</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
};

export default Settings;
