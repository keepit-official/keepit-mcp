/**
 * Encodes dynamic path segments before they are interpolated into request URLs.
 * This keeps reserved characters from altering the intended path structure.
 */
export const encodePathSegment = (value: string): string => encodeURIComponent(value);
