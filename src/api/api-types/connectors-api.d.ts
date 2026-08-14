import type { CONNECTOR_TYPES } from '../../tools/connector/connectors-tools-definitions.js';

interface IConnector {
    guid: string;
    name: string;
    created: string;
    type: TCloudType;
    agent_type?: string;
    backup_retention?: string;
    orglink?: string;
    retention_updated?: string;
}

interface IDevice {
    guid: string;
    accessible: boolean;
    name: string;
    type: TCloudType;
    created: string;
    orglink?: string;
    'agent-type'?: string;
    'backup-retention'?: string;
    'backup-retention-updated'?: string;
}
interface IHealthResponse {
    health: Health;
    reason: HealthReason;
}
interface IAggregatedHealthResponse extends IHealthResponse {
    guid: string;
}

interface IConnectorHealthParams {
    reason?: boolean;
}

interface IAggregatedConnectorsHealthParams extends IConnectorHealthParams {
    type?: TCloudType;
}

interface IAggregatedRsiSummaryParams {
    'device_type'?: TCloudType;
}

type Health = 'healthy' | 'unhealthy' | 'critical';
type HealthReason =
    | 'OK'
    | 'GENERIC'
    | 'NOCHECKIN'
    | 'CLOUDNOCHECKIN'
    | 'BADLOGIN'
    | 'NONADMINLOGIN'
    | 'BADTOKEN'
    | 'QUOTAVIOLATED'
    | 'INCOMPLETECONFIG_O365_ADMIN'
    | 'INCOMPLETECONFIG_AZURE_AD'
    | 'INCOMPLETECONFIG_AZURE_DO'
    | 'INCOMPLETECONFIG_GSUITE'
    | 'INITIAL_CONFIGURATION_PENDING'
    | 'MISSING_TEAMS_CHAT_APP_REGISTRATION'
    | 'MISSING_PLANS_PRESENT'
    | 'BLOCKEDBYEXTERNALQUOTA'
    | 'GRACETIMERSTARTED'
    | 'GRACETIMEREXPIRED'
    | 'SMALLFILESBACKUP'
    | 'THROTTLINGBACKUP'
    | 'EMPTY_ROOT'
    | 'SNAPSHOT_CREATION_CONFLICT';
    
type TCloudType = typeof CONNECTOR_TYPES[number];
type TDeviceErrorCode =
    | 'E_START' | 'E_CONFIG' | 'E_TERM' | 'E_RESOLVE' | 'E_CONNECT'
    | 'E_LOGIN' | 'E_READ' | 'E_WRITE' | 'E_READ_API' | 'E_WRITE_API'
    | 'E_REVOKED' | 'E_EMPTY_ROOT' | 'E_OVERSIZE_ROOT' | 'E_QUOTA'
    | 'E_LOGIN_ADMIN' | 'E_INCOMPLETE_CONNECTOR_CONFIG'
    | 'E_INITIAL_CONFIGURATION_PENDING'
    | 'E_DEDICATED_APP_IS_NOT_PRESENT_CRITICAL'
    | 'E_DEDICATED_APP_IS_NOT_PRESENT_UNHEALTHY'
    | 'E_WORKLOADS_WITH_MISSING_PLANS_PRESENT_CRITICAL'
    | 'E_WORKLOADS_WITH_MISSING_PLANS_PRESENT_UNHEALTHY';

type TDeviceStatusCode = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7';

interface IDeviceStatus {
    adata?: {
        objectsuploaded: string;
        objectstotal: string;
        ecode?: TDeviceErrorCode;
    };
    ecode?: TDeviceErrorCode;
    status?: TDeviceStatusCode;
}

type TDevicesKeys =
    | 'device-guid' | 'device-kind' | 'device-name' | 'device-type'
    | 'account-guid' | 'account-role' | 'account-name' | 'account-type'
    | 'account-email' | 'account-company';

type ICriticalDeviceAttributeMap = Record<TDevicesKeys, string>;

interface ICriticalConnector {
    'device-guid': string;
    'device-name': string;
    'device-type': string;
    'account-guid': string;
    'account-name': string;
    'account-email': string;
    'account-company': string;
    failureReason: string;
}

type TCriticalDeviceNode = {
    'children-count': number;
    name: string;
    data: { attribute: { key: TDevicesKeys; value: string; }[]; };
};

