import { getMeta, setMeta } from "@/lib/db/meta";

const ONBOARDING_SEEN_KEY = "onboarding_seen";

/**
 * Device-level flag (not user-scoped) — onboarding runs before anyone signs in,
 * so there is no user id to key it by. Stored in the same `app_meta` table the
 * demo-seed marker uses.
 */
export const hasSeenOnboarding = async (): Promise<boolean> => {
  try {
    return Boolean(await getMeta(ONBOARDING_SEEN_KEY));
  } catch (error) {
    // If the database can't be read, don't block the app on a welcome screen.
    console.warn("Couldn't read the onboarding flag:", error);
    return true;
  }
};

export const markOnboardingSeen = async (): Promise<void> => {
  try {
    await setMeta(ONBOARDING_SEEN_KEY, new Date().toISOString());
  } catch (error) {
    // Non-fatal: worst case the user sees onboarding once more.
    console.warn("Couldn't record that onboarding was seen:", error);
  }
};
