import crypto from 'crypto';

let cachedHashedGuid: string | null = null;

export const getHashedUserGuid = (guid: string, secretKey: string): string => {
    if (cachedHashedGuid) {
        return cachedHashedGuid;
    }

    const hashed = crypto
        .createHmac('sha256', secretKey)
        .update(guid)
        .digest('hex');

    cachedHashedGuid = hashed;
    return hashed;
};
