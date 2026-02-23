export const sanitizeIPAddress = (ip: string): string => {
    if (!ip || ip === 'Unknown') return ip;

    // Basic IP validation (IPv4 and IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
        return ip;
    }

    // If not a valid IP, sanitize it
    return ip.replace(/[^0-9a-fA-F:.]/g, '').substring(0, 45); // Max IPv6 length
};
