import dayjs, { type Dayjs } from "dayjs";

export const PERSON_NAME_REGEX = /^\p{L}+(?:\s+\p{L}+)*$/u;

export const PERSON_NAME_MESSAGE = "Only letters and spaces are allowed";

export const disableFutureDate = (current: Dayjs) =>
  current.isAfter(dayjs().endOf("day"));
