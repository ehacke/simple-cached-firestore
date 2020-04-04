import { isDate, isFunction, isNil, isString } from 'lodash';
import { DateTime } from 'luxon';

export const stringNotDate = (input: any | string): input is string => {
  return isString(input);
};

interface FirestoreTimestamp {
  toDate(): Date;
}

export const firestoreTimestamp = (input: any | FirestoreTimestamp): input is FirestoreTimestamp => {
  return isFunction((input as FirestoreTimestamp).toDate);
};

export const toDate = (input: Date | string | FirestoreTimestamp): Date => {
  if (isNil(input)) return input;
  if (isDate(input)) return input;
  if (firestoreTimestamp(input)) return input.toDate();
  return stringNotDate(input) ? DateTime.fromISO(input).toUTC().toJSDate() : input;
};
