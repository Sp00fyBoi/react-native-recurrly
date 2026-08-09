import SubscriptionCard from "@/components/SubscriptionCard";
import { colors } from "@/constants/theme";
import "@/global.css";
import { useSubscriptions } from "@/lib/subscriptions-store";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
  const [query, setQuery] = useState("");
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { subscriptions, status, error, refresh, updateSubscription } =
    useSubscriptions();
  const posthog = usePostHog();

  const handleCancelSubscription = async (subscription: Subscription) => {
    setCancellingId(subscription.id);
    try {
      await updateSubscription(subscription.id, { status: "cancelled" });
      posthog.capture("subscription_cancelled", {
        subscription_id: subscription.id,
        category: subscription.category ?? "Other",
        screen: "subscriptions",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const filteredSubscriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return subscriptions;

    return subscriptions.filter((subscription) =>
      [subscription.name, subscription.plan, subscription.category]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, subscriptions]);

  const lastTrackedQuery = useRef<string | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      lastTrackedQuery.current = null;
      return;
    }

    const timeout = setTimeout(() => {
      if (lastTrackedQuery.current === trimmedQuery) return;
      lastTrackedQuery.current = trimmedQuery;
      posthog.capture("subscriptions_searched", {
        query_length: trimmedQuery.length,
        result_count: filteredSubscriptions.length,
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [query, filteredSubscriptions.length, posthog]);

  if (status === "loading") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-5">
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (status === "error") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-5">
        <Text className="auth-error text-center">{error}</Text>
        <Pressable
          className="auth-button mt-4 self-stretch"
          onPress={refresh}
          accessibilityRole="button"
        >
          <Text className="auth-button-text">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      {error && <Text className="auth-error text-center">{error}</Text>}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          className="flex-1"
          data={filteredSubscriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SubscriptionCard
              {...item}
              expanded={expandedSubscriptionId === item.id}
              isCancelling={cancellingId === item.id}
              onCancelPress={() => handleCancelSubscription(item)}
              onPress={() => {
                const isExpanding = expandedSubscriptionId !== item.id;
                setExpandedSubscriptionId(isExpanding ? item.id : null);
                if (isExpanding) {
                  posthog.capture("subscription_card_expanded", {
                    subscription_id: item.id,
                    screen: "subscriptions",
                  });
                }
              }}
            />
          )}
          extraData={`${expandedSubscriptionId}:${cancellingId}`}
          ItemSeparatorComponent={() => <View className="h-4" />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <>
              <Text className="list-title mb-6">Subscriptions</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name, plan, or category"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                className="subs-search"
              />
            </>
          }
          ListEmptyComponent={
            <Text className="home-empty-state">
              {query.trim()
                ? `No subscriptions match "${query.trim()}".`
                : "No subscriptions yet."}
            </Text>
          }
          contentContainerClassName="pb-30"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Subscriptions;
