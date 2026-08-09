import SubscriptionCard from "@/components/SubscriptionCard";
import { colors } from "@/constants/theme";
import "@/global.css";
import { useSubscriptions } from "@/lib/subscriptions-store";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
  const { subscriptions } = useSubscriptions();
  const posthog = usePostHog();

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

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
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
          extraData={expandedSubscriptionId}
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
