import images from "@/constants/images";
import { colors } from "@/constants/theme";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { clsx } from "clsx";
import { styled } from "nativewind";
import { useState } from "react";
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

type FieldErrors = {
  identifier?: string;
  password?: string;
};

const SignIn = () => {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});

  const isSubmitting = fetchStatus === "fetching";
  const globalError = errors.global?.[0];
  const identifierError = localErrors.identifier ?? errors.fields.identifier?.message;
  const passwordError = localErrors.password ?? errors.fields.password?.message;

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

  const handleSignIn = async () => {
    if (!signIn || isSubmitting) return;
    if (!validate()) return;

    const { error } = await signIn.password({
      identifier: identifier.trim(),
      password,
    });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) return;
          router.replace("/(tabs)");
        },
      });
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
            <Text className="auth-title">Welcome back</Text>
            <Text className="auth-subtitle">
              Sign in to continue managing your subscriptions
            </Text>
          </View>

          <View className="auth-card">
            <View className="auth-form">
              {globalError && (
                <Text className="auth-error text-center">
                  {globalError.longMessage ?? globalError.message}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
