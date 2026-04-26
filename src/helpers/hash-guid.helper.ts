import { createHash } from 'node:crypto';

// A single-user MCP process sees at most one unique GUID per session, so this cache
// never grows beyond one entry in practice.
const hashedGuidCache = new Map<string, string>();

export const getHashedUserGuid = (guid: string): string => {
    const cached = hashedGuidCache.get(guid);
    if (cached) {
        return cached;
    }

    const hashed = createHash('sha256').update(guid).digest('hex');
    hashedGuidCache.set(guid, hashed);
    return hashed;
};
