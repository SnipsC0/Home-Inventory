import { ItemLocation } from '../types';

export const validateDate = (dateStr: string): boolean => {
  if (dateStr === '') return true;
  const regex = /^(\d{1,4})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
  return regex.test(dateStr);
};
