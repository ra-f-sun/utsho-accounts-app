/** MBCS class integer → display name mapping */
export const MBCS_CLASS_MAP: Record<number, string> = {
  0: 'Play Group',
  1: 'Nursery',
  2: 'KG',
  3: 'Class 1',
  4: 'Class 2',
  5: 'Class 3',
  6: 'Class 4',
  7: 'Class 5',
  8: 'Class 6',
  9: 'Class 7',
  10: 'Class 8',
};

/** Ordered list of MBCS classes */
export const MBCS_CLASSES = Object.entries(MBCS_CLASS_MAP).map(
  ([value, label]) => ({ value: Number(value), label }),
);
