import { subscriptionRepository } from "@/lib/repositories";
import { seedDemoDataIfNeeded } from "@/lib/repositories/seed-demo-data";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type LoadStatus = "loading" | "ready" | "error";

type SubscriptionsContextValue = {
  subscriptions: Subscription[];
  status: LoadStatus;
  error?: string;
  refresh: () => Promise<void>;
  addSubscription: (input: CreateSubscriptionInput) => Promise<Subscription | undefined>;
  /** `false` when the write failed — callers use this to gate analytics. */
  updateSubscription: (
    id: string,
    patch: UpdateSubscriptionPatch,
  ) => Promise<boolean>;
  removeSubscription: (id: string) => Promise<boolean>;
};

const SubscriptionsContext = createContext<
  SubscriptionsContextValue | undefined
>(undefined);

const LOAD_ERROR = "We couldn't load your subscriptions.";
const WRITE_ERROR = "We couldn't save that change. Please try again.";

export const SubscriptionsProvider = ({
  userId,
  children,
}: {
  /** `null` while signed out — the provider stays mounted and simply holds no data. */
  userId: string | null;
  children: ReactNode;
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | undefined>();

  // Guards against setState landing after unmount or after a user switch.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Every load claims a ticket. Seeding plus listing is slow enough that a fast
  // user switch (or a manual refresh during one) can leave two runs in flight;
  // without this the older one lands last and shows the previous account's rows.
  const loadRunRef = useRef(0);

  const load = useCallback(async () => {
    const runId = ++loadRunRef.current;
    const isSuperseded = () =>
      !isMountedRef.current || loadRunRef.current !== runId;

    if (!userId) {
      setSubscriptions([]);
      setStatus("ready");
      setError(undefined);
      return;
    }

    setStatus("loading");
    setError(undefined);

    try {
      await seedDemoDataIfNeeded(subscriptionRepository, userId);
      const rows = await subscriptionRepository.list(userId);
      if (isSuperseded()) return;
      setSubscriptions(rows);
      setStatus("ready");
    } catch {
      if (isSuperseded()) return;
      setSubscriptions([]);
      setError(LOAD_ERROR);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addSubscription = useCallback(
    async (input: CreateSubscriptionInput) => {
      if (!userId) return undefined;
      try {
        const created = await subscriptionRepository.create(userId, input);
        if (isMountedRef.current) {
          setSubscriptions((current) => [created, ...current]);
          setError(undefined);
        }
        return created;
      } catch {
        if (isMountedRef.current) setError(WRITE_ERROR);
        return undefined;
      }
    },
    [userId],
  );

  const updateSubscription = useCallback(
    async (id: string, patch: UpdateSubscriptionPatch) => {
      if (!userId) return false;
      try {
        const updated = await subscriptionRepository.update(userId, id, patch);
        if (!updated) return false;
        if (isMountedRef.current) {
          setSubscriptions((current) =>
            current.map((item) => (item.id === id ? updated : item)),
          );
          setError(undefined);
        }
        return true;
      } catch {
        if (isMountedRef.current) setError(WRITE_ERROR);
        return false;
      }
    },
    [userId],
  );

  const removeSubscription = useCallback(
    async (id: string) => {
      if (!userId) return false;
      try {
        await subscriptionRepository.remove(userId, id);
        if (isMountedRef.current) {
          setSubscriptions((current) =>
            current.filter((item) => item.id !== id),
          );
          setError(undefined);
        }
        return true;
      } catch {
        if (isMountedRef.current) setError(WRITE_ERROR);
        return false;
      }
    },
    [userId],
  );

  const value = useMemo(
    () => ({
      subscriptions,
      status,
      error,
      refresh: load,
      addSubscription,
      updateSubscription,
      removeSubscription,
    }),
    [
      subscriptions,
      status,
      error,
      load,
      addSubscription,
      updateSubscription,
      removeSubscription,
    ],
  );

  return (
    <SubscriptionsContext.Provider value={value}>
      {children}
    </SubscriptionsContext.Provider>
  );
};

export const useSubscriptions = (): SubscriptionsContextValue => {
  const context = useContext(SubscriptionsContext);
  if (!context) {
    throw new Error(
      "useSubscriptions must be used within a SubscriptionsProvider",
    );
  }
  return context;
};
