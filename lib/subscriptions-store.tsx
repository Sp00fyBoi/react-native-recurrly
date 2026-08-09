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
  updateSubscription: (
    id: string,
    patch: UpdateSubscriptionPatch,
  ) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
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
  userId: string;
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

  const load = useCallback(async () => {
    setStatus("loading");
    setError(undefined);

    try {
      await seedDemoDataIfNeeded(subscriptionRepository, userId);
      const rows = await subscriptionRepository.list(userId);
      if (!isMountedRef.current) return;
      setSubscriptions(rows);
      setStatus("ready");
    } catch {
      if (!isMountedRef.current) return;
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
      try {
        const updated = await subscriptionRepository.update(userId, id, patch);
        if (!updated || !isMountedRef.current) return;
        setSubscriptions((current) =>
          current.map((item) => (item.id === id ? updated : item)),
        );
        setError(undefined);
      } catch {
        if (isMountedRef.current) setError(WRITE_ERROR);
      }
    },
    [userId],
  );

  const removeSubscription = useCallback(
    async (id: string) => {
      try {
        await subscriptionRepository.remove(userId, id);
        if (!isMountedRef.current) return;
        setSubscriptions((current) => current.filter((item) => item.id !== id));
        setError(undefined);
      } catch {
        if (isMountedRef.current) setError(WRITE_ERROR);
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
