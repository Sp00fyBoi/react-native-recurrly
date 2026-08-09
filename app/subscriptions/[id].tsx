import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import { icons, tintForLightSurface } from "@/constants/icons";
import { colors } from "@/constants/theme";
import "@/global.css";
import { useSubscriptions } from "@/lib/subscriptions-store";
import {
  formatCurrency,
  formatStatusLabel,
  formatSubscriptionDateTime,
} from "@/lib/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

type PendingAction = "status" | "delete" | null;

const SubscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const { subscriptions, status, updateSubscription, removeSubscription } =
    useSubscriptions();
  const [pending, setPending] = useState<PendingAction>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const subscription = subscriptions.find((item) => item.id === id);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/subscriptions");
  };

  if (status === "loading") {
    return (
      <SafeAreaView className="screen-centered">
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  // Covers a stale deep link and the moment right after a delete.
  if (!subscription) {
    return (
      <SafeAreaView className="screen-centered">
        <Text className="auth-title text-center">Subscription not found</Text>
        <Text className="auth-subtitle text-center">
          It may have been deleted.
        </Text>
        <Pressable
          className="auth-button mt-6 self-stretch"
          onPress={goBack}
          accessibilityRole="button"
        >
          <Text className="auth-button-text">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isCancelled = subscription.status === "cancelled";
  const isPaused = subscription.status === "paused";

  const handleToggleStatus = async () => {
    const nextStatus: SubscriptionStatus = isPaused ? "active" : "paused";
    setPending("status");
    try {
      await updateSubscription(subscription.id, { status: nextStatus });
      posthog.capture("subscription_status_changed", {
        subscription_id: subscription.id,
        status: nextStatus,
      });
    } finally {
      setPending(null);
    }
  };

  const handleCancel = async () => {
    setPending("status");
    try {
      await updateSubscription(subscription.id, { status: "cancelled" });
      posthog.capture("subscription_cancelled", {
        subscription_id: subscription.id,
        category: subscription.category ?? "Other",
        screen: "detail",
      });
    } finally {
      setPending(null);
    }
  };

  const handleEdit = async (
    subscriptionId: string,
    patch: UpdateSubscriptionPatch,
  ) => {
    await updateSubscription(subscriptionId, patch);
    posthog.capture("subscription_edited", {
      subscription_id: subscriptionId,
      fields: Object.keys(patch).join(","),
      screen: "detail",
    });
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete subscription",
      `Permanently delete ${subscription.name}? This cannot be undone.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setPending("delete");
            try {
              await removeSubscription(subscription.id);
              posthog.capture("subscription_deleted", {
                subscription_id: subscription.id,
              });
              goBack();
            } finally {
              setPending(null);
            }
          },
        },
      ],
    );
  };

  const rows: { label: string; value: string }[] = [
    { label: "Category", value: subscription.category?.trim() || "Not provided" },
    { label: "Plan", value: subscription.plan?.trim() || "Not provided" },
    {
      label: "Payment",
      value: subscription.paymentMethod?.trim() || "Not provided",
    },
    {
      label: "Started",
      value: formatSubscriptionDateTime(subscription.startDate),
    },
    {
      label: "Renews",
      value: formatSubscriptionDateTime(subscription.renewalDate),
    },
    { label: "Billing", value: subscription.billing },
  ];

  return (
    <SafeAreaView className="screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
      >
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
          <Text className="screen-header-title">Details</Text>
          <View className="screen-header-spacer" />
        </View>

        <View
          className="detail-hero"
          style={{ backgroundColor: subscription.color ?? colors.muted }}
        >
          <Image
            source={subscription.icon}
            className="detail-hero-icon"
            style={{ tintColor: tintForLightSurface(subscription.iconKey) }}
          />
          <Text className="detail-hero-name">{subscription.name}</Text>
          <Text className="detail-hero-price">
            {formatCurrency(subscription.price, subscription.currency)}
          </Text>
          <Text className="detail-hero-billing">{subscription.billing}</Text>
          <View className="detail-status-pill">
            <Text className="detail-status-text">
              {formatStatusLabel(subscription.status)}
            </Text>
          </View>
        </View>

        <View className="settings-info-card">
          {rows.map((row) => (
            <View key={row.label} className="settings-info-row">
              <Text className="settings-info-label">{row.label}</Text>
              <Text
                className="settings-info-value"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <View className="detail-actions">
          <Pressable
            className="detail-secondary-button"
            onPress={() => setIsEditOpen(true)}
            disabled={pending !== null}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${subscription.name}`}
          >
            <Text className="detail-secondary-text">Edit subscription</Text>
          </Pressable>

          {!isCancelled && (
            <>
              <Pressable
                className="detail-secondary-button"
                onPress={handleToggleStatus}
                disabled={pending !== null}
                accessibilityRole="button"
              >
                {pending === "status" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text className="detail-secondary-text">
                    {isPaused ? "Resume subscription" : "Pause subscription"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                className="sub-cancel"
                onPress={handleCancel}
                disabled={pending !== null}
                accessibilityRole="button"
              >
                <Text className="sub-cancel-text">Cancel subscription</Text>
              </Pressable>
            </>
          )}

          <Pressable
            className="detail-danger-button"
            onPress={confirmDelete}
            disabled={pending !== null}
            accessibilityRole="button"
          >
            {pending === "delete" ? (
              <ActivityIndicator color={colors.destructive} />
            ) : (
              <Text className="detail-danger-text">Delete</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <CreateSubscriptionModal
        visible={isEditOpen}
        subscription={subscription}
        onClose={() => setIsEditOpen(false)}
        onUpdate={handleEdit}
      />
    </SafeAreaView>
  );
};

export default SubscriptionDetails;
