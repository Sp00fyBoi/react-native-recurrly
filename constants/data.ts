import { icons } from "./icons";

export const tabs: AppTab[] = [
    { name: "index", title: "Home", icon: icons.home },
    { name: "subscriptions", title: "Subscriptions", icon: icons.wallet },
    { name: "insights", title: "Insights", icon: icons.activity },
    { name: "settings", title: "Settings", icon: icons.setting },
];

/**
 * Sample rows inserted once into a brand-new account so the dashboard isn't
 * empty on first launch. Renewal dates are relative to insert time so the
 * derived "Upcoming" list always has something in range.
 *
 * Delete this (and `lib/repositories/seed-demo-data.ts`) once real data lands.
 */
const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const monthsAgo = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString();
};

export const DEMO_SUBSCRIPTIONS: CreateSubscriptionInput[] = [
    {
        name: "Adobe Creative Cloud",
        iconKey: "adobe",
        plan: "Teams Plan",
        category: "Design",
        paymentMethod: "Visa ending in 8530",
        status: "active",
        startDate: monthsAgo(17),
        price: 77.49,
        currency: "USD",
        billing: "Monthly",
        renewalDate: daysFromNow(11),
        color: "#f5c542",
    },
    {
        name: "GitHub Pro",
        iconKey: "github",
        plan: "Developer",
        category: "Developer Tools",
        paymentMethod: "Mastercard ending in 2408",
        status: "active",
        startDate: monthsAgo(21),
        price: 9.99,
        currency: "USD",
        billing: "Monthly",
        renewalDate: daysFromNow(15),
        color: "#e8def8",
    },
    {
        name: "Claude Pro",
        iconKey: "claude",
        plan: "Pro Plan",
        category: "AI Tools",
        paymentMethod: "Amex ending in 1010",
        status: "paused",
        startDate: monthsAgo(14),
        price: 20.0,
        currency: "USD",
        billing: "Monthly",
        renewalDate: daysFromNow(18),
        color: "#b8d4e3",
    },
    {
        name: "Canva Pro",
        iconKey: "canva",
        plan: "Yearly Access",
        category: "Design",
        paymentMethod: "Visa ending in 7784",
        status: "active",
        startDate: monthsAgo(28),
        price: 119.99,
        currency: "USD",
        billing: "Yearly",
        renewalDate: daysFromNow(24),
        color: "#b8e8d0",
    },
];
