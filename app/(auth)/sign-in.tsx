import images from "@/constants/images";
import { colors } from "@/constants/theme";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
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
const UNEXPECTED_ERROR =
  "Something went wrong. Check your connection and try again.";

type Stage = "form" | "verify";

type FieldErrors = {
  identifier?: string;
  password?: string;
};

const SignIn = () => {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const posthog = usePostHog();

  const [stage, setStage] = useState<Stage>("form");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const [statusNotice, setStatusNotice] = useState<string | undefined>();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);

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
    }
  };

  return (
    <SafeAreaView className="auth-safe-area">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="auth-scroll"
          contentContainerClassName="auth-content"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
            {stage === "form" ? (
              <>
                <Text className="auth-title">Welcome back</Text>
                <Text className="auth-subtitle">
                  Sign in to continue managing your subscriptions
                </Text>
              </>
            ) : (
              <>
                <Text className="auth-title">Verify it&apos;s you</Text>
                <Text className="auth-subtitle">
                  Enter the 6-digit code we sent to {identifier}
                </Text>
              </>
            )}
          </View>

          <View className="auth-card">
            {stage === "form" ? (
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
                    onPress={handleVerify}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text className="auth-button-text">Verify</Text>
                    )}
                  </Pressable>

                  <Pressable
                    className="auth-secondary-button"
                    onPress={handleResend}
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
