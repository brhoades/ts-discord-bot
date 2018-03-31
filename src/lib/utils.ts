// Truncate a string to meet some specified length
export const truncate = (long: string, length: number = 1024): string => {
  if (long.length >= length) {
    return `${long.slice(1, length - 3)}...`;
  }

  return long;
};
