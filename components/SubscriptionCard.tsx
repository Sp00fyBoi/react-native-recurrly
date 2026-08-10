import { tintForLightSurface } from "@/constants/icons";
import { colors } from "@/constants/theme";
import {
  formatCurrency,
  formatStatusLabel,
  formatSubscriptionDateTime,
} from "@/lib/utils";
import { clsx } from "clsx";
import React from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";

const SubscriptionCard = ({
  name,
  price,
  currency,
  icon,
  iconKey,
  billing,
  color,
  category,
  plan,
  renewalDate,
  onPress,
  expanded,
  paymentMethod,
  status,
  onCancelPress,
  isCancelling,
  onDetailsPress,
  onEditPress,
}: SubscriptionCardProps) => {
  const canCancel = Boolean(onCancelPress) && status !== "cancelled";

  return (
    <Pressable
      onPress={onPress}
      className={clsx("sub-card", expanded ? "sub-card-expanded" : "bg-card")}
      style={!expanded && color ? { backgroundColor: color } : undefined}
    >
      <View className="sub-head">
        <View className="sub-main">
          <Image
            source={icon}
            className="sub-icon"
            // `wallet` — the fallback for anything without a brand logo — is a
            // white glyph, so it has to be tinted on these light cards.
            style={{ tintColor: tintForLightSurface(iconKey) }}
          />
          <View className="sub-copy">
            <Text numberOfLines={1} className="sub-title">
              {name}
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail" className="sub-meta">
              {plan?.trim() ||
                category?.trim() ||
                (renewalDate
                  ? formatSubscriptionDateTime(renewalDate)
                  : "Not provided")}
            </Text>
          </View>
        </View>

        <View className="sub-price-box">
          <Text className="sub-price">{formatCurrency(price, currency)}</Text>
          <Text className="sub-billing">{billing}</Text>
        </View>
      </View>

      {expanded && (
        <View className="sub-body">
          <View className="sub-details">
            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Payment info:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {paymentMethod?.trim() || "Not provided"}
                </Text>
              </View>
              {onEditPress && (
                <Pressable
                  className="sub-chip"
                  onPress={onEditPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage payment info for ${name}`}
                >
                  <Text className="sub-chip-text">Manage</Text>
                </Pressable>
              )}
            </View>

            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Plan details:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {plan?.trim() || category?.trim() || "Not provided"}
                </Text>
              </View>
              {onEditPress && (
                <Pressable
                  className="sub-chip"
                  onPress={onEditPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Change plan for ${name}`}
                >
                  <Text className="sub-chip-text">Change</Text>
                </Pressable>
              )}
            </View>

            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Renews:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {renewalDate
                    ? formatSubscriptionDateTime(renewalDate)
                    : "Not provided"}
                </Text>
              </View>
            </View>

            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Status:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {status ? formatStatusLabel(status) : "Not provided"}
                </Text>
              </View>
            </View>
          </View>

          {onDetailsPress && (
            <Pressable
              className="detail-secondary-button"
              onPress={onDetailsPress}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${name}`}
            >
              <Text className="detail-secondary-text">View details</Text>
            </Pressable>
          )}

          {canCancel && (
            <Pressable
              className={clsx("sub-cancel", isCancelling && "sub-cancel-disabled")}
              onPress={onCancelPress}
              disabled={isCancelling}
              accessibilityRole="button"
              accessibilityLabel={`Cancel ${name}`}
              accessibilityState={{ busy: isCancelling, disabled: isCancelling }}
            >
              {isCancelling ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="sub-cancel-text">Cancel Subscription</Text>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

export default SubscriptionCard;
