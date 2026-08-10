import images from "@/constants/images";
import { colors } from "@/constants/theme";
import { useSignIn } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { clsx } from "clsx";
import { styled } from "nativewind";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

const SafeAreaView = styled(RNSafeAreaView);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 30;
const MIN_PASSWORD_LENGTH = 8;
const UNEXPECTED_ERROR =
  "Something went wrong. Check your connection and try again.";

type Stage = "form" | "verify" | "reset-code" | "reset-password";

/**
 * Clerk throws structured errors out of the SSO flow rather than returning
 * them, and so does the dependency loader inside it. Reporting the real text
 * matters: a missing native dependency used to surface as "check your
 * connection", which sent debugging in entirely the wrong direction.
 */
const describeError = (error: unknown): string => {
  if (!error || typeof error !== "object") return UNEXPECTED_ERROR;

  const candidate = error as {
    message?: unknown;
    longMessage?: unknown;
    errors?: { message?: unknown; longMessage?: unknown }[];
  };
  const first = candidate.errors?.[0];

  for (const value of [
    first?.longMessage,
    first?.message,
    candidate.longMessage,
    candidate.message,
  ]) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return UNEXPECTED_ERROR;
};

/**
 * Android keeps the Custom Tab process cold otherwise, which makes the OAuth
 * hand-off slow and, on some devices, drop the redirect entirely.
 */
const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

type FieldErrors = {
  identifier?: string;
  password?: string;
};

const SignIn = () => {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const posthog = usePostHog();

  useWarmUpBrowser();

  const [stage, setStage] = useState<Stage>("form");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const [statusNotice, setStatusNotice] = useState<string | undefined>();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState<string | undefined>();
  const [isSocialBusy, setIsSocialBusy] = useState(false);

  const isSubmitting = fetchStatus === "fetching";
  const globalError = errors.global?.[0];
  const identifierError = localErrors.identifier ?? errors.fields.identifier?.message;
  const passwordError = localErrors.password ?? errors.fields.password?.message;
  const verifyCodeError = codeError ?? errors.fields.code?.message;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const validate = () => {
    const next: FieldErrors = {};
    if (!identifier.trim()) {
      next.identifier = "Email is required";
    } else if (!EMAIL_REGEX.test(identifier.trim())) {
      next.identifier = "Enter a valid email address";
    }
    if (!password) {
      next.password = "Password is required";
    }
    setLocalErrors(next);
    return Object.keys(next).length === 0;
  };

  const finalizeSession = async () => {
    if (!signIn) return;
    await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask || !session?.user) {
          setStatusNotice(
            "Your account needs additional setup that isn't supported yet. Please contact support."
          );
          return;
        }
        posthog.identify(session.user.id, {
          ...(session.user.primaryEmailAddress?.emailAddress
            ? { email: session.user.primaryEmailAddress.emailAddress }
            : {}),
          ...(session.user.fullName ?? session.user.firstName
            ? { name: session.user.fullName ?? session.user.firstName }
            : {}),
        });
        posthog.capture("sign_in_completed", {
          authentication_method: "password",
        });
        router.replace("/(tabs)");
      },
    });
  };

  const handleSignIn = async () => {
    if (!signIn || isSubmitting) return;
    if (!validate()) return;
    setStatusNotice(undefined);

    try {
      const { error } = await signIn.password({
        identifier: identifier.trim(),
        password,
      });
      if (error) return;

      if (signIn.status === "complete") {
        await finalizeSession();
        return;
      }

      if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const supportsEmailCode = signIn.supportedSecondFactors.some(
          (factor) => factor.strategy === "email_code"
        );
        if (supportsEmailCode) {
          const { error: sendError } = await signIn.mfa.sendEmailCode();
          if (sendError) return;
          setStage("verify");
          setCooldown(RESEND_COOLDOWN_SECONDS);
          return;
        }
      }

      setStatusNotice(
        "This account requires additional verification that isn't supported yet. Please contact support."
      );
    } catch {
      setStatusNotice(UNEXPECTED_ERROR);
    }
  };

  const handleVerify = async () => {
    if (!signIn || isSubmitting) return;
    if (!code.trim()) {
      setCodeError("Enter the 6-digit code");
      return;
    }
    setCodeError(undefined);
    setStatusNotice(undefined);

    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (error) return;

      if (signIn.status === "complete") {
        await finalizeSession();
        return;
      }

      setStatusNotice(
        "This account requires additional verification that isn't supported yet. Please contact support."
      );
    } catch {
      setStatusNotice(UNEXPECTED_ERROR);
    }
  };

  const handleResend = async () => {
    if (!signIn || cooldown > 0 || isSubmitting) return;
    try {
      const { error } = await signIn.mfa.sendEmailCode();
      if (!error) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch {
      setStatusNotice(UNEXPECTED_ERROR);
    }
  };

  /**
   * Password reset, per Clerk's flow: seed the attempt with an identifier,
   * send a code, verify it (status becomes `needs_new_password`), then submit
   * the new password and finalize.
   */
  const handleForgotPassword = async () => {
    if (!signIn || isSubmitting) return;

    const email = identifier.trim();
    if (!email || !EMAIL_REGEX.test(email)) {
      setLocalErrors((prev) => ({
        ...prev,
        identifier: "Enter your email first, then tap Forgot password",
      }));
      return;
    }

    setStatusNotice(undefined);
    setLocalErrors({});

    try {
      const { error: createError } = await signIn.create({ identifier: email });
      if (createError) return;

      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (error) return;

      setCode("");
      setCodeError(undefined);
      setStage("reset-code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setStatusNotice(UNEXPECTED_ERROR);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!signIn || isSubmitting) return;
    if (!code.trim()) {
      setCodeError("Enter the 6-digit code");
      return;
    }
    setCodeError(undefined);
    setStatusNotice(undefined);

    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });
      if (error) return;

      setNewPassword("");
      setNewPasswordError(undefined);
      setStage("reset-password");
    } catch {
      setStatusNotice(UNEXPECTED_ERROR);
    }
  };

  const handleSubmitNewPassword = async () => {
    if (!signIn || isSubmitting) return;
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setNewPasswordError(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setNewPasswordError(undefined);
    setStatusNotice(undefined);

    try {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (error) return;

      if (signIn.status === "complete") {
        posthog.capture("password_reset_completed");
        await finalizeSession();
        return;
      }

      setStatusNotice(
        "Your password was updated but sign-in needs another step. Please sign in again."
      );
    } catch {
      setStatusNotice(UNEXPECTED_ERROR);
    }
  };

  const handleResendResetCode = async () => {
    if (!signIn || cooldown > 0 || isSubmitting) return;
    try {
      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (!error) setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setStatusNotice(UNEXPECTED_ERROR);
    }
  };

  /**
   * Uses the Core 3 SSO hook, which opens the browser session and activates the
   * resulting session itself — so there is no setActive call here.
   */
  const handleGoogleSignIn = async () => {
    if (isSocialBusy || isSubmitting) return;
    setIsSocialBusy(true);
    setStatusNotice(undefined);

    try {
      const { createdSessionId, authSessionResult } = await startSSOFlow({
        strategy: "oauth_google",
      });

      if (createdSessionId) {
        posthog.capture("sign_in_completed", {
          authentication_method: "oauth_google",
        });
        router.replace("/(tabs)");
        return;
      }

      // A successful browser round-trip without a new session means Clerk
      // reactivated an existing one. The tabs layout redirects straight back
      // here if that turns out not to have happened.
      if (authSessionResult?.type === "success") {
        router.replace("/(tabs)");
        return;
      }

      // Anything else is the user dismissing the browser — not an error.
    } catch (error) {
      setStatusNotice(describeError(error));
    } finally {
      setIsSocialBusy(false);
    }
  };

  const handleUseDifferentAccount = async () => {
    try {
      await signIn?.reset();
    } catch {
      // Resetting is best-effort; the local form is cleared either way.
    } finally {
      setStage("form");
      setCode("");
      setCodeError(undefined);
      setStatusNotice(undefined);
      setCooldown(0);
      setPassword("");
      setShowPassword(false);
      setNewPassword("");
      setNewPasswordError(undefined);
    }
  };

  return (
    <SafeAreaView className="auth-safe-area">
      {/* `padding` on Android too, not just iOS. `edgeToEdgeEnabled` adds
          windowTranslucentStatus, which Expo documents as breaking the default
          `resize` keyboard mode — leaving `behavior` undefined there made this
          a no-op and let the keyboard sit over the password field. */}
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          className="auth-scroll"
          contentContainerClassName="auth-content"
          keyboardShouldPersistTaps="handled"
          // Not "on-drag": scrolling to reach a field below the fold should not
          // close the keyboard the user is mid-way through typing with.
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View className="auth-brand-block">
            <View className="auth-logo-wrap">
              <Image
                source={images.logo}
                className="size-14 rounded-2xl"
                resizeMode="cover"
              />
              <View>
                <Text className="auth-wordmark">Recurly</Text>
                <Text className="auth-wordmark-sub">Smart Billing</Text>
              </View>
            </View>
            {stage === "form" && (
              <>
                <Text className="auth-title">Welcome back</Text>
                <Text className="auth-subtitle">
                  Sign in to continue managing your subscriptions
                </Text>
              </>
            )}
            {(stage === "verify" || stage === "reset-code") && (
              <>
                <Text className="auth-title">
                  {stage === "reset-code"
                    ? "Reset your password"
                    : "Verify it's you"}
                </Text>
                <Text className="auth-subtitle">
                  Enter the 6-digit code we sent to {identifier}
                </Text>
              </>
            )}
            {stage === "reset-password" && (
              <>
                <Text className="auth-title">Choose a new password</Text>
                <Text className="auth-subtitle">
                  This replaces the password on {identifier}
                </Text>
              </>
            )}
          </View>

          <View className="auth-card">
            {stage === "reset-password" ? (
              <>
                <View className="auth-form">
                  {(globalError || statusNotice) && (
                    <Text className="auth-error text-center">
                      {globalError
                        ? (globalError.longMessage ?? globalError.message)
                        : statusNotice}
                    </Text>
                  )}

                  <View className="auth-field">
                    <View className="flex-row items-center justify-between">
                      <Text className="auth-label">New password</Text>
                      <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                        <Text className="auth-link text-xs">
                          {showPassword ? "Hide" : "Show"}
                        </Text>
                      </Pressable>
                    </View>
                    <TextInput
                      className={clsx(
                        "auth-input",
                        newPasswordError && "auth-input-error"
                      )}
                      placeholder="Create a new password"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (newPasswordError) setNewPasswordError(undefined);
                      }}
                    />
                    {newPasswordError && (
                      <Text className="auth-error">{newPasswordError}</Text>
                    )}
                  </View>

                  <Pressable
                    className={clsx("auth-button", isSubmitting && "auth-button-disabled")}
                    onPress={handleSubmitNewPassword}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text className="auth-button-text">Update password</Text>
                    )}
                  </Pressable>
                </View>

                <View className="auth-link-row">
                  <Pressable onPress={handleUseDifferentAccount}>
                    <Text className="auth-link">Back to sign in</Text>
                  </Pressable>
                </View>
              </>
            ) : stage === "form" ? (
              <>
                <View className="auth-form">
                  {(globalError || statusNotice) && (
                    <Text className="auth-error text-center">
                      {globalError
                        ? (globalError.longMessage ?? globalError.message)
                        : statusNotice}
                    </Text>
                  )}

                  <View className="auth-field">
                    <Text className="auth-label">Email</Text>
                    <TextInput
                      className={clsx("auth-input", identifierError && "auth-input-error")}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      value={identifier}
                      onChangeText={(text) => {
                        setIdentifier(text);
                        if (localErrors.identifier) {
                          setLocalErrors((prev) => ({ ...prev, identifier: undefined }));
                        }
                      }}
                    />
                    {identifierError && <Text className="auth-error">{identifierError}</Text>}
                  </View>

                  <View className="auth-field">
                    <View className="flex-row items-center justify-between">
                      <Text className="auth-label">Password</Text>
                      <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                        <Text className="auth-link text-xs">
                          {showPassword ? "Hide" : "Show"}
                        </Text>
                      </Pressable>
                    </View>
                    <TextInput
                      className={clsx("auth-input", passwordError && "auth-input-error")}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoComplete="password"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (localErrors.password) {
                          setLocalErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                    />
                    {passwordError && <Text className="auth-error">{passwordError}</Text>}
                  </View>

                  <Pressable
                    className={clsx("auth-button", isSubmitting && "auth-button-disabled")}
                    onPress={handleSignIn}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text className="auth-button-text">Sign in</Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleForgotPassword}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                  >
                    <Text className="auth-link text-center text-sm">
                      Forgot password?
                    </Text>
                  </Pressable>

                  <View className="auth-divider-row">
                    <View className="auth-divider-line" />
                    <Text className="auth-divider-text">or</Text>
                    <View className="auth-divider-line" />
                  </View>

                  <Pressable
                    className={clsx(
                      "auth-social-button",
                      isSocialBusy && "auth-button-disabled"
                    )}
                    onPress={handleGoogleSignIn}
                    disabled={isSocialBusy || isSubmitting}
                    accessibilityRole="button"
                  >
                    {isSocialBusy ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text className="auth-social-text">Continue with Google</Text>
                    )}
                  </Pressable>
                </View>

                <View className="auth-link-row">
                  <Text className="auth-link-copy">New to Recurly?</Text>
                  <Link href="/(auth)/sign-up" className="auth-link">
                    Create an account
                  </Link>
                </View>
              </>
            ) : (
              <>
                <View className="auth-form">
                  {(globalError || statusNotice) && (
                    <Text className="auth-error text-center">
                      {globalError
                        ? (globalError.longMessage ?? globalError.message)
                        : statusNotice}
                    </Text>
                  )}

                  <View className="auth-field">
                    <Text className="auth-label">Verification code</Text>
                    <TextInput
                      className={clsx(
                        "auth-input tracking-[8px]",
                        verifyCodeError && "auth-input-error"
                      )}
                      style={{ textAlign: "center" }}
                      placeholder="000000"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={code}
                      onChangeText={(text) => {
                        setCode(text);
                        if (codeError) setCodeError(undefined);
                      }}
                    />
                    {verifyCodeError && <Text className="auth-error">{verifyCodeError}</Text>}
                  </View>

                  <Pressable
                    className={clsx("auth-button", isSubmitting && "auth-button-disabled")}
                    onPress={
                      stage === "reset-code" ? handleVerifyResetCode : handleVerify
                    }
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text className="auth-button-text">
                        {stage === "reset-code" ? "Continue" : "Verify"}
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    className="auth-secondary-button"
                    onPress={
                      stage === "reset-code" ? handleResendResetCode : handleResend
                    }
                    disabled={cooldown > 0 || isSubmitting}
                  >
                    <Text className="auth-secondary-button-text">
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                    </Text>
                  </Pressable>
                </View>

                <View className="auth-link-row">
                  <Pressable onPress={handleUseDifferentAccount}>
                    <Text className="auth-link">Use a different account</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
