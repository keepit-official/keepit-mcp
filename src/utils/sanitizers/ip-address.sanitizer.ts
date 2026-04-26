import { isIPv4, isIPv6 } from 'node:net';

export const sanitizeIPAddress = (ip: string): string => {
    if (!ip || ip === 'Unknown') return ip;

    if (isIPv4(ip) || isIPv6(ip)) {
        return ip;
    }

    // Fallback for non-standard values: strip anything that can't appear in an IPv4/IPv6 address
    // and truncate to 45 chars (the maximum length of a full IPv6 address). Legitimate IPs always
    // pass the isIPv4/isIPv6 checks above and never reach this path.
    return ip.replace(/[^0-9a-fA-F:.]/g, '').substring(0, 45);
};
