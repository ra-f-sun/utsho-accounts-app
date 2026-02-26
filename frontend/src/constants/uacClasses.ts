export const UAC_CLASS_MAP: Record<number, string> = {
  8: "Class 8",
  9: "Class 9",
  10: "Class 10",
  11: "Class 11",
  12: "Class 12",
};

export const UAC_CLASSES = Object.entries(UAC_CLASS_MAP).map(
  ([value, label]) => ({ value: Number(value), label }),
);
