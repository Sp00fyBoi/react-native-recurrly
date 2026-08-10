import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import SubscriptionCard from "@/components/SubscriptionCard";
import { icons } from "@/constants/icons";
import { colors } from "@/constants/theme";
import "@/global.css";
import { monthlyEquivalent } from "@/lib/subscription-metrics";
import { useSubscriptions } from "@/lib/subscriptions-store";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { clsx } from "clsx";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView as RNSafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const SORT_OPTIONS = [
  { key: "recent", label: "Recently added" },
  { key: "name", label: "Name (A–Z)" },
  { key: "price", label: "Monthly cost (high–low)" },
  { key: "renewal", label: "Renewal date" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

/** Sorts a copy — the store's array is shared with the other screens. */
const sortSubscriptions = (
  items: Subscription[],
  sortBy: SortKey,
): Subscription[] => {
  if (sortBy === "recent") return [...items];

  return [...items].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "price":
        return monthlyEquivalent(b) - monthlyEquivalent(a);
      case "renewal": {
        // Rows without a renewal date sink to the bottom rather than sorting
        // as epoch 0 and jumping to the top.
        const left = a.renewalDate ? dayjs(a.renewalDate).valueOf() : Infinity;
        const right = b.renewalDate ? dayjs(b.renewalDate).valueOf() : Infinity;
        return left - right;
      }
      default:
        return 0;
    }
  });
};

const Subscriptions = () => {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const {
    subscriptions,
    status,
    error,
    refresh,
    updateSubscription,
  } = useSubscriptions();
  const posthog = usePostHog();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const handleCancelSubscription = async (subscription: Subscription) => {
    setCancellingId(subscription.id);
    try {
      const cancelled = await updateSubscription(subscription.id, {
        status: "cancelled",
      });
      if (!cancelled) return;

      posthog.capture("subscription_cancelled", {
        subscription_id: subscription.id,
        category: subscription.category ?? "Other",
        screen: "subscriptions",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleSaveEdit = async (
    id: string,
    patch: UpdateSubscriptionPatch,
  ) => {
    const saved = await updateSubscription(id, patch);
    if (!saved) return;

    posthog.capture("subscription_edited", {
      subscription_id: id,
      fields: Object.keys(patch).join(","),
    });
  };

  const visibleSubscriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matched = normalizedQuery
      ? subscriptions.filter((subscription) =>
          [
            subscription.name,
            subscription.plan,
            subscription.category,
            subscription.paymentMethod,
          ]
            .filter((field): field is string => Boolean(field))
            .some((field) => field.toLowerCase().includes(normalizedQuery)),
        )
      : subscriptions;

    return sortSubscriptions(matched, sortBy);
  }, [query, sortBy, subscriptions]);

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
        result_count: visibleSubscriptions.length,
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [query, visibleSubscriptions.length, posthog]);

  if (status === "loading") {
    return (
      <SafeAreaView className="screen-centered">
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (status === "error") {
    return (
      <SafeAreaView className="screen-centered">
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

        <Text className="screen-header-title">My Subscriptions</Text>

        <Pressable
          className="screen-header-button"
          onPress={() => setIsMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Sort subscriptions"
        >
          <Image
            source={icons.menu}
            className="screen-header-icon"
            resizeMode="contain"
            style={{ tintColor: colors.primary }}
          />
        </Pressable>
      </View>

      {error && <Text className="auth-error text-center">{error}</Text>}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          className="flex-1"
          data={visibleSubscriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SubscriptionCard
              {...item}
              expanded={expandedSubscriptionId === item.id}
              isCancelling={cancellingId === item.id}
              onCancelPress={() => handleCancelSubscription(item)}
              onEditPress={() => setEditing(item)}
              onDetailsPress={() => {
                posthog.capture("subscription_detail_opened", {
                  subscription_id: item.id,
                  screen: "subscriptions",
                });
                router.push({
                  pathname: "/subscriptions/[id]",
                  params: { id: item.id },
                });
              }}
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
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, plan, category, or payment method"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              className="subs-search"
            />
          }
          ListEmptyComponent={
            <Text className="home-empty-state">
              {query.trim()
                ? `No subscriptions match "${query.trim()}".`
                : "No subscriptions yet."}
            </Text>
          }
          contentContainerClassName="screen-scroll-content"
        />
      </KeyboardAvoidingView>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <Pressable
          className="menu-backdrop"
          onPress={() => setIsMenuVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss menu"
        >
          {/* Claims the touch so taps inside the sheet don't reach the
              backdrop and close it. */}
          <View
            className="menu-sheet"
            style={{ top: insets.top + 76 }}
            onStartShouldSetResponder={() => true}
          >
            {SORT_OPTIONS.map((option) => {
              const isActive = sortBy === option.key;
              return (
                <Pressable
                  key={option.key}
                  className="menu-item"
                  onPress={() => {
                    setSortBy(option.key);
                    setIsMenuVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    className={clsx(
                      "menu-item-text",
                      isActive && "menu-item-text-active",
                    )}
                  >
                    {option.label}
                  </Text>
                  {isActive && <Text className="menu-item-check">✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* No `onCreate`: this sheet is only ever opened from a card's edit
          action, so `visible` is never true without a subscription. */}
      <CreateSubscriptionModal
        visible={editing !== null}
        subscription={editing}
        onClose={() => setEditing(null)}
        onUpdate={handleSaveEdit}
      />
    </SafeAreaView>
  );
};

export default Subscriptions;
