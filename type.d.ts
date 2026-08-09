import type { ImageSourcePropType } from "react-native";
import type { IconKey } from "./constants/icons";

declare global {
    interface AppTab {
        name: string;
        title: string;
        icon: ImageSourcePropType;
    }

    interface TabIconProps {
        focused: boolean;
        icon: ImageSourcePropType;
    }

    type SubscriptionStatus = "active" | "paused" | "cancelled";

    interface Subscription {
        id: string;
        userId: string;
        name: string;
        /** Persisted. `icon` is resolved from this when a row is read. */
        iconKey: IconKey;
        /** Hydrated bundled asset — derived from `iconKey`, never stored. */
        icon: ImageSourcePropType;
        plan?: string;
        category?: string;
        paymentMethod?: string;
        status: SubscriptionStatus;
        startDate?: string;
        price: number;
        currency: string;
        billing: string;
        renewalDate?: string;
        color?: string;
        createdAt: string;
        updatedAt: string;
    }

    /** What a caller supplies to create a row; the store fills in ids/timestamps. */
    interface CreateSubscriptionInput {
        name: string;
        iconKey: IconKey;
        plan?: string;
        category?: string;
        paymentMethod?: string;
        status?: SubscriptionStatus;
        startDate?: string;
        price: number;
        currency: string;
        billing: string;
        renewalDate?: string;
        color?: string;
    }

    type UpdateSubscriptionPatch = Partial<
        Omit<Subscription, "id" | "userId" | "icon" | "createdAt" | "updatedAt">
    >;

    interface SubscriptionCardProps
        extends Omit<Subscription, "id" | "userId" | "createdAt" | "updatedAt"> {
        expanded: boolean;
        onPress: () => void;
        onCancelPress?: () => void;
        isCancelling?: boolean;
    }

    interface UpcomingSubscription {
        id: string;
        icon: ImageSourcePropType;
        name: string;
        price: number;
        currency?: string;
        daysLeft: number;
    }

    interface UpcomingSubscriptionCardProps
        extends Omit<UpcomingSubscription, "id"> {}

    interface ListHeadingProps {
        title: string;
    }

    interface CreateSubscriptionModalProps {
        visible: boolean;
        onClose: () => void;
        onCreate: (subscription: CreateSubscriptionInput) => void;
    }
}

export {};
