/**
 * Shared types and utility functions for the account tool layer.
 *
 * All types and helpers in this file are used by two or more of the
 * account tool helper files (nav, single, msp) and are kept here to
 * avoid circular imports between those files.
 */
import type { ToolResult } from '../tools.interfaces.js';

export type TMeta = Record<string, unknown>;
export type TToolResult<T> = ToolResult<T> & { meta?: TMeta; };
export type TTokenLike = {
    guid?: string | null;
    aname?: string | null;
    descr?: string | null;
    created?: string | null;
    lastuse?: string | null;
    acl?: string | null;
    primary?: boolean | string;
    primary_aname?: string | null;
    expires?: string | null;
    lifetime?: string | null;
};
export type TAccountMfa = { enabled: boolean; totp: boolean; trusted_ips: boolean; };
export type TAccountSso = { enabled: boolean; configurations: Array<Record<string, unknown>>; };
export type TUserMfa = { configured: boolean; rules: Array<Record<string, unknown>>; };
export type TResource = {
    evaluated?: string | null;
    name?: string | null;
    type?: string | null;
    unit?: string | null;
    usage?: unknown;
    limit?: unknown;
    violated?: boolean;
};

export const withMeta = <T>(result: T, messages: string[], meta: TMeta): TToolResult<T> => ({
    result,
    success: true,
    messages,
    meta
});

export const coerceNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
