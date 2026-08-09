import type { IconKey } from "@/constants/icons";
import { colors } from "@/constants/theme";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const FREQUENCIES = ["Monthly", "Yearly"] as const;

type Frequency = (typeof FREQUENCIES)[number];

const CATEGORIES = [
  "Entertainment",
  "AI Tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<Category, string> = {
  Entertainment: "#f9c9c0",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#f5c542",
  Productivity: "#c9e4de",
  Cloud: "#cfe0f5",
  Music: "#b8e8d0",
  Other: "#f6eecf",
};

type FormErrors = {
  name?: string;
  price?: string;
};

const validateName = (value: string): string | undefined =>
  value.trim() ? undefined : "Name is required";

const validatePrice = (value: string): string | undefined => {
  if (!value.trim()) return "Price is required";
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "Enter a price greater than 0";
  }
  return undefined;
};

/**
 * Only brand logos are matchable. Matching against every key in `icons` would
 * let UI glyphs win on substrings — "Backblaze" would resolve to the back
 * arrow, "Homebrew" to the home icon.
 */
const BRAND_ICON_KEYS: IconKey[] = [
  "notion",
  "dropbox",
  "openai",
  "adobe",
  "medium",
  "figma",
  "spotify",
  "github",
  "claude",
  "canva",
];

/**
 * Picks a bundled brand icon when the typed name matches one, so common
 * services get their real logo instead of the generic wallet.
 */
const matchIconKey = (name: string): IconKey => {
  const normalized = name.toLowerCase().replace(/\s+/g, "");
  return BRAND_ICON_KEYS.find((key) => normalized.includes(key)) ?? "wallet";
};

// Android renders <Modal> in its own native Dialog window, which the activity's
// adjustResize / edge-to-edge handling doesn't reach, so KeyboardAvoidingView
// never receives correct resize events in there and the keyboard covers the
// inputs. Track the keyboard height directly and pad the container instead.
const useAndroidKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
};

const CreateSubscriptionModal = ({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [category, setCategory] = useState<Category>("Entertainment");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const androidKeyboardHeight = useAndroidKeyboardHeight();

  const isValid = !validateName(name) && !validatePrice(price);

  const resetForm = () => {
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory("Entertainment");
    setFormErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const nameError = validateName(name);
    const priceError = validatePrice(price);

    if (nameError || priceError) {
      setFormErrors({ name: nameError, price: priceError });
      return;
    }

    const trimmedName = name.trim();
    const parsedPrice = Number(price.trim());
    const startDate = dayjs();
    const renewalDate =
      frequency === "Monthly"
        ? startDate.add(1, "month")
        : startDate.add(1, "year");

    onCreate({
      name: trimmedName,
      iconKey: matchIconKey(trimmedName),
      category,
      status: "active",
      startDate: startDate.toISOString(),
      price: parsedPrice,
      currency: "USD",
      billing: frequency,
      renewalDate: renewalDate.toISOString(),
      color: CATEGORY_COLORS[category],
    });

    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="modal-overlay">
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View
            className="modal-container"
            style={
              Platform.OS === "android"
                ? { marginBottom: androidKeyboardHeight }
                : undefined
            }
          >
            <View className="modal-header">
              <Text className="modal-title">New Subscription</Text>
              <Pressable
                className="modal-close"
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text className="modal-close-text">×</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View className="modal-body">
                <View className="auth-field">
                  <Text className="auth-label">Name</Text>
                  <TextInput
                    className={clsx(
                      "auth-input",
                      formErrors.name && "auth-input-error",
                    )}
                    placeholder="e.g. Netflix"
                    placeholderTextColor={colors.mutedForeground}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (formErrors.name) {
                        setFormErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    onBlur={() =>
                      setFormErrors((prev) => ({
                        ...prev,
                        name: validateName(name),
                      }))
                    }
                  />
                  {formErrors.name && (
                    <Text className="auth-error">{formErrors.name}</Text>
                  )}
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Price</Text>
                  <TextInput
                    className={clsx(
                      "auth-input",
                      formErrors.price && "auth-input-error",
                    )}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={(text) => {
                      setPrice(text);
                      if (formErrors.price) {
                        setFormErrors((prev) => ({ ...prev, price: undefined }));
                      }
                    }}
                    onBlur={() =>
                      setFormErrors((prev) => ({
                        ...prev,
                        price: validatePrice(price),
                      }))
                    }
                  />
                  {formErrors.price && (
                    <Text className="auth-error">{formErrors.price}</Text>
                  )}
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Frequency</Text>
                  <View className="picker-row">
                    {FREQUENCIES.map((option) => {
                      const isActive = frequency === option;
                      return (
                        <Pressable
                          key={option}
                          className={clsx(
                            "picker-option",
                            isActive && "picker-option-active",
                          )}
                          onPress={() => setFrequency(option)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isActive }}
                        >
                          <Text
                            className={clsx(
                              "picker-option-text",
                              isActive && "picker-option-text-active",
                            )}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Category</Text>
                  <View className="category-scroll">
                    {CATEGORIES.map((option) => {
                      const isActive = category === option;
                      return (
                        <Pressable
                          key={option}
                          className={clsx(
                            "category-chip",
                            isActive && "category-chip-active",
                          )}
                          onPress={() => setCategory(option)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isActive }}
                        >
                          <Text
                            className={clsx(
                              "category-chip-text",
                              isActive && "category-chip-text-active",
                            )}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Stays pressable while invalid so handleSubmit can surface
                    which fields are missing, rather than leaving the user with
                    a dimmed button and no explanation. */}
                <Pressable
                  className={clsx(
                    "auth-button",
                    !isValid && "auth-button-disabled",
                  )}
                  onPress={handleSubmit}
                >
                  <Text className="auth-button-text">Add Subscription</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default CreateSubscriptionModal;
