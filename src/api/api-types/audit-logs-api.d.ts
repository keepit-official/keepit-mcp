interface AuditLogToolResponse extends Record<string, unknown> {
    auditLogs: IAuditLogRecord[];
    pagination?: ToolPaginationResponse;
}
interface IAuditLogRecord {
    'client-ip': string;
    account?: string;
    account_id?: string;
    account_name?: string | null;
    acl: string;
    allowed: string;
    area?: string;
    company?: string;
    device?: string;
    message: string;
    metadata: Array<{
        parameter: {
            key: string;
            value: string;
        };
    }>;
    method: string;
    raw_token?: string;
    succeeded: string;
    time: string;
    token: string;
}

interface IAuditLogBody {
    account: string;
    from?: string | Date;
    to?: string | Date;
}

type TAuditLogRequest = z.infer<typeof AuditLogRequestSchema>;
