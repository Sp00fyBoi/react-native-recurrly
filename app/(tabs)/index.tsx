import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE, UPCOMING_SUBSCRIPTIONS } from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { useSubscriptions } from "@/lib/subscriptions-store";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useState } from "react";
import { Image, Pressable, Text, View, FlatList } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  const [expandedSubscriptionId, setExpandedSubscriptionId] =
    useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const { subscriptions, addSubscription } = useSubscriptions();
  const { user } = useUser();
  const posthog = usePostHog();

  const handleCreateSubscription = (subscription: Subscription) => {
    addSubscription(subscription);
    posthog.capture("subscription_created", {
      subscription_id: subscription.id,
      category: subscription.category ?? "Other",
      billing: subscription.billing,
    });
  };

  const displayName = user?.firstName ?? user?.fullName ?? "there";
  const avatarSource = user?.imageUrl ? { uri: user.imageUrl } : images.avatar;

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <FlatList
        className="flex-1"
        data={subscriptions}
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
                  screen: "home",
                });
              }
            }}
          />
        )}
        extraData={expandedSubscriptionId}
        ItemSeparatorComponent={() => <View className="h-4" />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* User Header */}
            <View className="home-header">
              <View className="home-user">
                <Image source={avatarSource} className="home-avatar" />
                <Text className="home-user-name">Hi, {displayName}</Text>
              </View>
              <Pressable
                onPress={() => setIsCreateModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Add subscription"
              >
                <Image source={icons.add} className="home-add-icon" />
              </Pressable>
            </View>

            {/* Balance Card */}
            <View className="home-balance-card">
              <Text className="home-balance-label">Balance</Text>
              <View className="home-balance-row">
                <Text className="home-balance-amount">
                  {formatCurrency(HOME_BALANCE.amount)}
                </Text>
                <Text className="home-balance-date">
                  {dayjs(HOME_BALANCE.nextRenewalDate).format("MM/DD")}
                </Text>
              </View>
            </View>

            {/* Upcoming Subscriptions Section */}
            <View className="mb-4">
              <ListHeading title="Upcoming" />
              <FlatList
                data={UPCOMING_SUBSCRIPTIONS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <UpcomingSubscriptionCard {...item} />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                  <Text className="home-empty-state">
                    No upcoming renewals yet.
                  </Text>
                }
              />
            </View>

            {/* Main Subscriptions List Heading */}
            <ListHeading title="All Subscriptions" />
          </>
        )}
        ListEmptyComponent={
          <Text className="home-empty-state">No subscriptions yet.</Text>
        }
        contentContainerClassName="pb-30"
      />

      <CreateSubscriptionModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreate={handleCreateSubscription}
      />
    </SafeAreaView>
  );
}