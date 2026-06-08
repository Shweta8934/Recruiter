// lib/validation.ts

/**
 * Validate a name string.
 * Ensures the name meets a minimum length and contains only letters (including Unicode), spaces, hyphens, and apostrophes.
 * @param name - Input name.
 * @param minLength - Minimum allowed characters (default 3).
 * @returns true if valid.
 */
export const isValidName = (name: string, minLength = 3): boolean => {
  const trimmed = name.trim();
  if (trimmed.length < minLength) return false;
  // Unicode letters \p{L}, spaces, hyphens, apostrophes.
  const regex = /^[\p{L}\s'-]+$/u;
  return regex.test(trimmed);
};
