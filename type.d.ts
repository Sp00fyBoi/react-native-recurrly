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
        /** When provided, the expanded card offers a link to the detail route. */
        onDetailsPress?: () => void;
        /** Backs the "Manage" / "Change" pills on the expanded card. */
        onEditPress?: () => void;
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

    interface DailySpend {
        /** Short weekday label, e.g. "Mon". */
        label: string;
        /** Total renewal amount falling on that day. */
        total: number;
    }

    interface WeeklySpendChartProps {
        days: DailySpend[];
        currency?: string;
    }

    interface ListHeadingProps {
        title: string;
        /** When omitted, the "View all" pill is not rendered at all. */
        onActionPress?: () => void;
        actionLabel?: string;
    }

    interface CreateSubscriptionModalProps {
        visible: boolean;
        onClose: () => void;
        /** Omitted where the sheet is only ever opened to edit an existing row. */
        onCreate?: (subscription: CreateSubscriptionInput) => void;
        /**
         * When set, the sheet opens in edit mode with every field prefilled
         * from this row and saves through `onUpdate` instead of `onCreate`.
         */
        subscription?: Subscription | null;
        onUpdate?: (id: string, patch: UpdateSubscriptionPatch) => void;
    }
}

export {};
