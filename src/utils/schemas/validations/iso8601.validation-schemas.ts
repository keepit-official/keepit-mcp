// ISO8601 duration validation with business logic validation
import { z } from 'zod';
import { durationToDays, parseISO8601Duration } from '../../../helpers/date.helper.js';

export const ISO8601DurationSchema = z.string()
    .superRefine((duration, ctx) => {
        let parsed;

        try {
            parsed = parseISO8601Duration(duration);
        } catch {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid ISO8601 duration format',
                fatal: true
            });
            return;
        }

        const days = durationToDays(parsed);

        if (days <= 0 || days > 365) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Duration must be greater than 0 days and cannot exceed 365 days'
            });
        }
    });


// ISO8601 timestamp validation
export const ISO8601TimestampSchema = z.string()
    .min(1, 'Timestamp cannot be empty')
    .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/,
        'Invalid ISO8601 timestamp format'
    )
    .refine((timestamp) => {
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                return false;
            }
            // Round-trip check: JS Date silently overflows invalid dates (e.g. Feb 31 → Mar 2),
            // so compare UTC components back against the original string to catch overflow.
            const parts = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
            if (!parts) {
                return false;
            }
            const [, year, month, day, hour, minute, second] = parts;
            return date.getUTCFullYear() === parseInt(year, 10) &&
                date.getUTCMonth() + 1 === parseInt(month, 10) &&
                date.getUTCDate() === parseInt(day, 10) &&
                date.getUTCHours() === parseInt(hour, 10) &&
                date.getUTCMinutes() === parseInt(minute, 10) &&
                date.getUTCSeconds() === parseInt(second, 10);
        } catch {
            return false;
        }
    }, 'Invalid ISO8601 timestamp format');
