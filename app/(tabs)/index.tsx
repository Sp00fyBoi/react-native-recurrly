import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import { colors } from "@/constants/theme";
import "@/global.css";
import {
  calculateMonthlyTotal,
  findNextRenewalDate,
  selectUpcomingSubscriptions,
} from "@/lib/subscription-metrics";
import { useSubscriptions } from "@/lib/subscriptions-store";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  const [expandedSubscriptionId, setExpandedSubscriptionId] =
    useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const {
    subscriptions,
    status,
    error,
    refresh,
    addSubscription,
    updateSubscription,
  } = useSubscriptions();
  const { user } = useUser();
  const posthog = usePostHog();
  const router = useRouter();

  const monthlyTotal = useMemo(
    () => calculateMonthlyTotal(subscriptions),
    [subscriptions],
  );
  const nextRenewalDate = useMemo(
    () => findNextRenewalDate(subscriptions),
    [subscriptions],
  );
  const upcomingSubscriptions = useMemo(
    () => selectUpcomingSubscriptions(subscriptions),
    [subscriptions],
  );

  const handleCreateSubscription = async (input: CreateSubscriptionInput) => {
    const created = await addSubscription(input);
    if (!created) return;

    posthog.capture("subscription_created", {
      subscription_id: created.id,
      category: created.category ?? "Other",
      billing: created.billing,
    });
  };

  const handleSaveEdit = async (id: string, patch: UpdateSubscriptionPatch) => {
    // The store swallows write failures into its `error` state, so without this
    // check a failed save would still report an edit to analytics.
    const saved = await updateSubscription(id, patch);
    if (!saved) return;

    posthog.capture("subscription_edited", {
      subscription_id: id,
      fields: Object.keys(patch).join(","),
    });
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
        screen: "home",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const displayName = user?.firstName ?? user?.fullName ?? "there";
  const avatarSource = user?.imageUrl ? { uri: user.imageUrl } : images.avatar;

  const listHeader = (
    <>
      {/* User Header */}
      <View className="home-header">
        <View className="home-user">
          <Image source={avatarSource} className="home-avatar" />
          <Text className="home-user-name">Hi, {displayName}</Text>
        </View>
        <Pressable
          className="screen-header-button"
          onPress={() => setIsCreateModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add subscription"
        >
          <Image
            source={icons.add}
            className="home-add-icon"
            resizeMode="contain"
            style={{ tintColor: colors.primary }}
          />
        </Pressable>
      </View>

      {/* Balance Card — derived from active subscriptions */}
      <View className="home-balance-card">
        <Text className="home-balance-label">Monthly spend</Text>
        <View className="home-balance-row">
          <Text className="home-balance-amount">
            {formatCurrency(monthlyTotal)}
          </Text>
          <Text className="home-balance-date">
            {nextRenewalDate ? dayjs(nextRenewalDate).format("MM/DD") : "—"}
          </Text>
        </View>
      </View>

      {/* Upcoming Subscriptions Section */}
      <View className="mb-4">
        <ListHeading
          title="Upcoming"
          onActionPress={() => router.push("/(tabs)/subscriptions")}
        />
        <FlatList
          data={upcomingSubscriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UpcomingSubscriptionCard {...item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="home-empty-state">No upcoming renewals yet.</Text>
          }
        />
      </View>

      {/* Main Subscriptions List Heading */}
      <ListHeading title="All Subscriptions" />
    </>
  );

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
      {error && <Text className="auth-error text-center">{error}</Text>}

      <FlatList
        className="flex-1"
        data={subscriptions}
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
                screen: "home",
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
                  screen: "home",
                });
              }
            }}
          />
        )}
        extraData={`${expandedSubscriptionId}:${cancellingId}`}
        ItemSeparatorComponent={() => <View className="h-4" />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text className="home-empty-state">No subscriptions yet.</Text>
        }
        contentContainerClassName="screen-scroll-content"
      />

      {/* One sheet serves both jobs — `subscription` is what flips it into
          edit mode, so the two can never be open at once. */}
      <CreateSubscriptionModal
        visible={isCreateModalVisible || editing !== null}
        subscription={editing}
        onClose={() => {
          setIsCreateModalVisible(false);
          setEditing(null);
        }}
        onCreate={handleCreateSubscription}
        onUpdate={handleSaveEdit}
      />
    </SafeAreaView>
  );
}
