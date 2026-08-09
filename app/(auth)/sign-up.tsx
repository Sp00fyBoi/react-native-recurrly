import images from "@/constants/images";
import { colors } from "@/constants/theme";
import { useSignUp } from "@clerk/expo";
import { clsx } from "clsx";
import { Link, useRouter } from "expo-router";
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

const SafeAreaView = styled(RNSafeAreaView);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 30;

type Stage = "form" | "verify";

type FormErrors = {
  emailAddress?: string;
  password?: string;
  confirmPassword?: string;
};

const SignUp = () => {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("form");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);
  const [statusNotice, setStatusNotice] = useState<string | undefined>();

  const isSubmitting = fetchStatus === "fetching";
  const globalError = errors.global?.[0];
  const emailError = formErrors.emailAddress ?? errors.fields.emailAddress?.message;
  const passwordError = formErrors.password ?? errors.fields.password?.message;
  const verifyCodeError = codeError ?? errors.fields.code?.message;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const validateForm = () => {
    const next: FormErrors = {};
    if (!emailAddress.trim()) {
      next.emailAddress = "Email is required";
    } else if (!EMAIL_REGEX.test(emailAddress.trim())) {
      next.emailAddress = "Enter a valid email address";
    }
    if (!password) {
      next.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (confirmPassword !== password) {
      next.confirmPassword = "Passwords don't match";
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (!signUp || isSubmitting) return;
    if (!validateForm()) return;

    const { error } = await signUp.password({
      emailAddress: emailAddress.trim(),
      password,
    });
    if (error) return;

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) return;

    setStage("verify");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleVerify = async () => {
    if (!signUp || isSubmitting) return;
    if (!code.trim()) {
      setCodeError("Enter the 6-digit code");
      return;
    }
    setCodeError(undefined);
    setStatusNotice(undefined);

    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (error) return;

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) {
            setStatusNotice(
              "Your account needs additional setup that isn't supported yet. Please contact support."
            );
            return;
          }
          router.replace("/(tabs)");
        },
      });
      return;
    }

    setStatusNotice(
      "We couldn't complete your sign-up automatically. Please contact support."
    );
  };

  const handleResend = async () => {
    if (!signUp || cooldown > 0 || isSubmitting) return;
    const { error } = await signUp.verifications.sendEmailCode();
    if (!error) setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleUseDifferentEmail = async () => {
    try {
      await signUp?.reset();
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
                <Text className="auth-title">Create your account</Text>
                <Text className="auth-subtitle">
                  Start tracking every subscription in one smart place
                </Text>
              </>
            ) : (
              <>
                <Text className="auth-title">Check your email</Text>
                <Text className="auth-subtitle">
                  Enter the 6-digit code we sent to {emailAddress}
                </Text>
              </>
            )}
          </View>

          <View className="auth-card">
            {stage === "form" ? (
              <>
                <View className="auth-form">
                  {globalError && (
                    <Text className="auth-error text-center">
                      {globalError.longMessage ?? globalError.message}
                    </Text>
                  )}

                  <View className="auth-field">
                    <Text className="auth-label">Email</Text>
                    <TextInput
                      className={clsx("auth-input", emailError && "auth-input-error")}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      value={emailAddress}
                      onChangeText={(text) => {
                        setEmailAddress(text);
                        if (formErrors.emailAddress) {
                          setFormErrors((prev) => ({ ...prev, emailAddress: undefined }));
                        }
                      }}
                    />
                    {emailError && <Text className="auth-error">{emailError}</Text>}
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
                      placeholder="Create a password"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (formErrors.password) {
                          setFormErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                    />
                    {passwordError && <Text className="auth-error">{passwordError}</Text>}
                  </View>

                  <View className="auth-field">
                    <Text className="auth-label">Confirm password</Text>
                    <TextInput
                      className={clsx(
                        "auth-input",
                        formErrors.confirmPassword && "auth-input-error"
                      )}
                      placeholder="Re-enter your password"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoComplete="password-new"
                      secureTextEntry={!showPassword}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (formErrors.confirmPassword) {
                          setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                    />
                    {formErrors.confirmPassword && (
                      <Text className="auth-error">{formErrors.confirmPassword}</Text>
                    )}
                  </View>

                  <Pressable
                    className={clsx("auth-button", isSubmitting && "auth-button-disabled")}
                    onPress={handleSignUp}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text className="auth-button-text">Create account</Text>
                    )}
                  </Pressable>
                </View>

                {/* Required for sign-up flows on Expo web; native iOS/Android skip the CAPTCHA. */}
                <View nativeID="clerk-captcha" />

                <View className="auth-link-row">
                  <Text className="auth-link-copy">Already have an account?</Text>
                  <Link href="/(auth)/sign-in" className="auth-link">
                    Sign in
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
                      <Text className="auth-button-text">Verify email</Text>
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
                  <Pressable onPress={handleUseDifferentEmail}>
                    <Text className="auth-link">Use a different email</Text>
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

export default SignUp;
