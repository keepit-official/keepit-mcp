interface ITotalUsageRaw {
    'seats-count': number;
    'connectors-count': number;
    'account-type': 'partner' | 'customer';
}

interface IMaxUsageResourceRaw {
    name: string;
    'maximum-usage': number;
    limit?: number;
}

interface ISeatAllocationItem {
    connectorType: string;
    connector: string | null;
    'max-usage': number;
}

interface ISeatAllocationResult {
    total: {
        'connectors-count': number;
        'seats-count': number;
        'account-type': 'partner' | 'customer';
    };
    allocation: ISeatAllocationItem[];
}

interface IUsageHistoryAggregatedResourceRaw {
    name: string;
    usage: number;
}

interface IUsageHistoryResourceRaw {
    name: string;
    usage: number;
    'aggregated-on'?: {
        resource: IUsageHistoryAggregatedResourceRaw | IUsageHistoryAggregatedResourceRaw[];
    };
}

interface IUsageHistorySnapshotRaw {
    time: string;
    resources: {
        resource: IUsageHistoryResourceRaw | IUsageHistoryResourceRaw[];
    };
}

type TSeatType = 'full' | 'light' | 'faculty' | 'student';

interface IUsageHistoryResource {
    name: string;
    readableName?: string;
    usage: number;
    seatType?: TSeatType;
    'aggregated-on'?: { name: string; readableName?: string; usage: number; }[];
}

interface IUsageHistorySnapshot {
    time: string;
    resources: IUsageHistoryResource[];
}

interface ISeatLimitResourceRaw {
    name: string;
    'readable-name': string;
    limit: number;
    usage: number;
    'grace-expires': string;
}

interface ISeatLimitResourceGroupRaw {
    name: string;
    resources: {
        resource: ISeatLimitResourceRaw | ISeatLimitResourceRaw[];
    };
}

interface ISeatLimitAccountRaw {
    guid: string;
    email: string;
    company_name: string;
    type: TWorkloadsType;
    'resources-violation': {
        'resource-group': ISeatLimitResourceGroupRaw | ISeatLimitResourceGroupRaw[];
    };
}

interface ISeatLimitViolation {
    name: TWorkloadsType;
    resource_name: string;
    'readable-name': string;
    limit: number;
    usage: number;
    overage: number;
    'grace-expires': string | null;
    isGraceExpired: boolean;
}

interface ISeatLimitAccount {
    guid: string;
    email: string;
    company_name: string;
    type: string;
    'resources-violation': ISeatLimitViolation[];
}

type TWorkloadsType =
    'o365-admin'
    | 'gsuite'
    | 'salesforce'
    | 'azuread'
    | 'azuredo'
    | 'dynamics365'
    | 'powerbi'
    | 'zendesk'
    | 'okta'
    | 'jira'
    | 'confluence'
    | 'bamboohr'
    | 'docusign'
    | 'miro';
