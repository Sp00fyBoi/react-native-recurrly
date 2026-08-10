import { View, Text, Image } from 'react-native'
import React from 'react'
import { formatCurrency } from '@/lib/utils'

const UpcomingSubscriptionCard = ({ name, price, daysLeft, icon, currency }: UpcomingSubscription) => {
  return (
    <View className='upcoming-card'>
      <View className='upcoming-row'>
        <Image source={icon} className="upcoming-icon" />
        <View className='upcoming-amount'>
            {/* Amounts are unbounded (and ₹ grouping makes them long), so let an
                outsized one shrink to fit rather than ellipsize — a clipped
                price reads as the wrong number. */}
            <Text
              className='upcoming-price'
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {formatCurrency(price, currency)}
            </Text>
            <Text className='upcoming-meta' numberOfLines={1}>{daysLeft > 1 ? `${daysLeft} days left` : 'Last day'}</Text>
        </View>
      </View>
      <Text className='upcoming-name' numberOfLines={1}>{name}</Text>
    </View>
  )
}

export default UpcomingSubscriptionCard