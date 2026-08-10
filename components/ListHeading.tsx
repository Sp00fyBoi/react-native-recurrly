import { Text, TouchableOpacity, View } from 'react-native'
import React from 'react'

/**
 * The "View all" pill only renders when given an action — otherwise it was a
 * button that looked tappable and did nothing.
 */
const ListHeading = ({ title, onActionPress, actionLabel = 'View all' }: ListHeadingProps) => {
  return (
    <View className='list-head'>
      <Text className='list-title'>{ title }</Text>
      {onActionPress && (
        <TouchableOpacity
          className='list-action'
          onPress={onActionPress}
          accessibilityRole='button'
          accessibilityLabel={`${actionLabel}: ${title}`}
        >
          <Text className='list-action-text'>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default ListHeading
