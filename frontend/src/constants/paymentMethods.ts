export const ALL_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

export type PaymentMethodValue = (typeof ALL_PAYMENT_METHODS)[number]["value"];
