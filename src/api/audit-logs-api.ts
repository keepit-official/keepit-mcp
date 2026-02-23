import { generateXmlBody } from '../helpers/xml-helper.js';
import { getHeaders } from '../helpers/make-request.helper.js';
import { logger } from '../logger/logger.js';
import { normalizeArrayResponse } from '../helpers/fetch.helper.js';
import { sanitizeIPAddress } from '../utils/sanitizers/ip-address.sanitizer.js';
import { XMLParser } from 'fast-xml-parser';
import type { IHeaderResponse, IMakeRequestHeaderParams } from '../helpers/interfaces/make-request.interface.js';
import type { ToolPaginationParams, ToolResult } from '../tools/tools.interfaces.js';
import xmlParseOptions from './fast-xml-parser-options.js';

const Parser = new XMLParser(xmlParseOptions);

function maskSensitiveToken(token: string): string {
    if (!token || token === 'Unknown') return token;
    if (token.length <= 8) return '***';
    return token.substring(0, 4) + '***' + token.substring(token.length - 4);
}

export const getAuditLogHistorySettings = (body: IAuditLogBody, paginationParams?: ToolPaginationParams) => {
    const DEFAULT_LIMIT = 50;

    const limit = paginationParams?.limit || DEFAULT_LIMIT;
    const offset = paginationParams?.offset || 0;

    const url = `/audit/filter/pretty?limit=${limit}&offset=${offset}`;

    const requestConfig: IMakeRequestHeaderParams = {
        url,
        method: 'PUT',
        headers: getHeaders('v4'),
        body: generateXmlBody(body, 'filter'),
        includeHeaders: true
    };

    const applyDataCallback = (response: IHeaderResponse) => {
        const jsonData = Parser.parse(response.data);

        const nextOffsetHeader = response.headers.get('next-offset');
        const nextOffset = nextOffsetHeader ? parseInt(nextOffsetHeader, 10) : undefined;

        const callbackResult: ToolResult<AuditLogToolResponse> = {
            result: {
                auditLogs: [],
                pagination: {
                    hasMorePages: !!nextOffset,
                    nextOffset,
                    totalInResponse: 0
                }
            },
            success: true
        };

        if (!jsonData.audit) {
            logger.info('[AUDIT_LOGS] No audit records found in response');
            return {
                ...callbackResult,
                messages: [`No audit log records found for the specified time range ${body.from} to ${body.to}`]
            };
        }

        const logEntries = normalizeArrayResponse<IAuditLogRecord>(jsonData.audit.record);

        logger.info(`[AUDIT_LOGS] Records in response: ${logEntries.length}, Offset: ${offset}, Limit: ${limit}`);

        const processedRecords: IAuditLogRecord[] = logEntries
            .reduce<IAuditLogRecord[]>((acc, record) => {
                if (record.account !== undefined) {
                    acc.push({
                        ...record,
                        token: maskSensitiveToken(record.token),
                        'client-ip': sanitizeIPAddress(record['client-ip'])
                    });
                }
                return acc;
            }, []);

        const totalRecords = processedRecords.length;

        logger.info(
            `[AUDIT_LOGS] Returning ${totalRecords} records ` +
            `(${offset + 1}-${offset + totalRecords})`
        );

        return {
            ...callbackResult,
            result: {
                auditLogs: processedRecords,
                pagination: {
                    hasMorePages: !!nextOffset,
                    nextOffset,
                    totalInResponse: totalRecords
                }
            },
            messages: [
                `Retrieved ${totalRecords} audit log records`,
                nextOffset ? `Use nextOffset ${nextOffset} to fetch more records` : 'No more records available'
            ]
        };
    };

    return { requestConfig, applyDataCallback };
};
