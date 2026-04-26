import { z } from 'zod';
import { ConnectorGuidSchema } from '../entities/connector.schemas.js';
import { durationToDays, parseISO8601Duration } from '../../../helpers/date.helper.js';
import { ISO8601TimestampSchema } from '../validations/iso8601.validation-schemas.js';

export const MAX_JOB_HISTORY_DAYS = 90;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const JobDurationSchema = z.string()
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
        if (days <= 0 || days > MAX_JOB_HISTORY_DAYS) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Duration cannot exceed ${MAX_JOB_HISTORY_DAYS} days. Job history is limited to ${MAX_JOB_HISTORY_DAYS} days per request — use a shorter duration or switch to startTime/endTime for a specific date range.`
            });
        }
    });

export const JobHistorySchema = z.object({
    guid: ConnectorGuidSchema,
    account_id: z.string().trim().min(1, 'Account id cannot be empty').optional(),
    scope: z.enum(['account', 'children', 'leaf', 'managed', 'all']).optional(),
    duration: JobDurationSchema.optional(),
    startTime: ISO8601TimestampSchema.optional(),
    endTime: ISO8601TimestampSchema.optional()
}).superRefine((data, ctx) => {
    const hasDuration = !!data.duration;
    const hasDateRange = !!data.startTime || !!data.endTime;

    if (hasDuration && hasDateRange) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Cannot use "duration" together with "startTime" or "endTime" — use one or the other, not both.'
        });
        return;
    }

    if (!data.startTime && data.endTime) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '"endTime" cannot be used without "startTime". Provide both to specify a date range, or use "duration" to look back from now.'
        });
        return;
    }

    if (data.startTime || data.endTime) {
        const start = data.startTime ? new Date(data.startTime) : null;
        const end = data.endTime ? new Date(data.endTime) : new Date();

        if (start && end <= start) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: '"endTime" must be after "startTime".'
            });
            return;
        }

        if (start) {
            const spanDays = (end.getTime() - start.getTime()) / MS_PER_DAY;
            if (spanDays > MAX_JOB_HISTORY_DAYS) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `The date range from ${data.startTime} to ${data.endTime ?? 'now'} spans ${Math.ceil(spanDays)} days, which exceeds the ${MAX_JOB_HISTORY_DAYS}-day limit. Job history cannot be retrieved for more than ${MAX_JOB_HISTORY_DAYS} days at a time — please split the request into smaller date ranges.`
                });
            }
        }
    }
});
