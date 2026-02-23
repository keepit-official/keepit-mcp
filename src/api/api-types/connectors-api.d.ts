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

type TCloudType =
    'o365-admin'
    | 'dynamics365'
    | 'sforce'
    | 'gsuite'
    | 'powerbi'
    | 'zendesk'
    | 'azure-do'
    | 'azure-ad'
    | 'dsl';
