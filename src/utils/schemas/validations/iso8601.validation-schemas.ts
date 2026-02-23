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
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return false;
            }
            // Basic date component validation
            const parts = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
            if (!parts) {
                return false;
            }

            const [, , month, day, hour, minute, second] = parts;
            const monthNum = parseInt(month, 10);
            const dayNum = parseInt(day, 10);
            const hourNum = parseInt(hour, 10);
            const minuteNum = parseInt(minute, 10);
            const secondNum = parseInt(second, 10);

            return monthNum >= 1 && monthNum <= 12 &&
                dayNum >= 1 && dayNum <= 31 &&
                hourNum >= 0 && hourNum <= 23 &&
                minuteNum >= 0 && minuteNum <= 59 &&
                secondNum >= 0 && secondNum <= 59;
        } catch {
            return false;
        }
    }, 'Invalid ISO8601 timestamp format');
