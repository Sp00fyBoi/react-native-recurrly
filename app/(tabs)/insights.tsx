import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import WeeklySpendChart from "@/components/WeeklySpendChart";
import { icons } from "@/constants/icons";
import { colors } from "@/constants/theme";
import "@/global.css";
import {
  calculateMonthlyTotal,
  countByStatus,
  groupSpendByCategory,
  selectDailySpend,
} from "@/lib/subscription-metrics";
import { useSubscriptions } from "@/lib/subscriptions-store";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useMemo } from "react";
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

const HISTORY_LIMIT = 3;

const Insights = () => {
  const { subscriptions, status, error, refresh } = useSubscriptions();
  const router = useRouter();
  const posthog = usePostHog();

  const metrics = useMemo(
    () => ({
      monthly: calculateMonthlyTotal(subscriptions),
      daily: selectDailySpend(subscriptions),
      byCategory: groupSpendByCategory(subscriptions),
      counts: countByStatus(subscriptions),
      history: [...subscriptions]
        .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
        .slice(0, HISTORY_LIMIT),
    }),
    [subscriptions],
  );

  const goToSubscriptions = () => router.push("/(tabs)/subscriptions");

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="screen-scroll-content"
      >
        <View className="screen-header">
          <Pressable
            className="screen-header-button"
            onPress={() => router.push("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <Image
              source={icons.back}
              className="screen-header-icon"
              resizeMode="contain"
              style={{ tintColor: colors.primary }}
            />
          </Pressable>

          <Text className="screen-header-title">Monthly Insights</Text>

          <Pressable
            className="screen-header-button"
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh insights"
          >
            <Text className="screen-header-glyph">⟳</Text>
          </Pressable>
        </View>

        {metrics.counts.total === 0 ? (
          <Text className="home-empty-state">
            Add a subscription to see your spending breakdown.
          </Text>
        ) : (
          <>
            <ListHeading title="Upcoming" onActionPress={goToSubscriptions} />
            <WeeklySpendChart days={metrics.daily} />

            {/* Headline spend */}
            <View className="expenses-card">
              <View className="expenses-row">
                <Text className="expenses-title">Expenses</Text>
                <Text className="expenses-amount">
                  {formatCurrency(metrics.monthly)}
                </Text>
              </View>
              <View className="expenses-row">
                <Text className="expenses-meta">
                  {dayjs().format("MMMM YYYY")}
                </Text>
                <Text className="expenses-meta">
                  {metrics.counts.active} active
                </Text>
              </View>
            </View>

            {/* Spend by category */}
            <View className="insights-card">
              <Text className="insights-card-title">Spend by category</Text>
              {metrics.byCategory.length === 0 ? (
                <Text className="home-empty-state">
                  No active subscriptions to break down.
                </Text>
              ) : (
                metrics.byCategory.map((group) => (
                  <View key={group.category} className="insights-category">
                    <View className="insights-category-head">
                      <Text className="insights-category-name" numberOfLines={1}>
                        {group.category}
                      </Text>
                      <Text className="insights-category-amount">
                        {formatCurrency(group.monthly)}
                      </Text>
                    </View>
                    <View className="insights-bar-track">
                      <View
                        className="insights-bar-fill"
                        style={{
                          width: `${Math.max(group.share * 100, 2)}%`,
                          backgroundColor: group.color ?? colors.accent,
                        }}
                      />
                    </View>
                    <Text className="insights-category-meta">
                      {group.count}{" "}
                      {group.count === 1 ? "subscription" : "subscriptions"} ·{" "}
                      {Math.round(group.share * 100)}%
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Recently added */}
            <ListHeading title="History" onActionPress={goToSubscriptions} />
            <View className="gap-4">
              {metrics.history.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  {...subscription}
                  expanded={false}
                  onPress={() => {
                    posthog.capture("subscription_detail_opened", {
                      subscription_id: subscription.id,
                      screen: "insights",
                    });
                    router.push({
                      pathname: "/subscriptions/[id]",
                      params: { id: subscription.id },
                    });
                  }}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;
