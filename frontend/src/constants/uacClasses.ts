export const UAC_CLASS_MAP: Record<number, string> = {
  8: "Class 8",
  9: "Class 9",
  10: "Class 10",
  11: "Class 11",
  12: "Class 12",
  13: "Graduated",
};

export const UAC_CLASSES = Object.entries(UAC_CLASS_MAP).map(
  ([value, label]) => ({ value: Number(value), label }),
);

export const UAC_ADMISSION_CLASSES = UAC_CLASSES.filter((c) => c.value <= 12);

export const UAC_CLASS_FILTER_OPTIONS = UAC_CLASSES;

export const uacClassLabel = (cls: number) =>
  UAC_CLASS_MAP[cls] ?? `Class ${cls}`;
