export const CONNECTOR_TYPE_LABELS: Record<string, string> = {
    'sforce': 'Salesforce',
    'o365-admin': 'Microsoft 365',
    'azure-ad': 'Microsoft Entra ID',
    'powerbi': 'Power BI',
    'dynamics365': 'Dynamics 365',
    'azure-do': 'Azure DevOps',
    'gsuite': 'Google Workspace',
    'zendesk': 'Zendesk'
};

// Maps connector types to their resource API name candidates in priority order.
// getCurrentSeatsForConnectorType in account-tools-single.helper.ts takes the
// first resource whose usage is non-null, so earlier entries take precedence.
export const CONNECTOR_TYPE_RESOURCE_NAMES: Record<string, string[]> = {
    'sforce': ['salesforce-seats'],
    'o365-admin': ['m365-seats', 'm365-quadseats-total', 'm365-mailboxonedrive-total'],
    'azure-ad': ['entraid-users-total', 'azuread-users'],
    'powerbi': ['powerbi-users', 'powerbi-users-light'],
    'dynamics365': ['dynamics365-users', 'dynamics365-users-light'],
    'azure-do': ['azuredo-users'],
    'gsuite': ['gsuite-seats', 'gw-quadseats-total'],
    'zendesk': ['zendesk-users']
};

export const getConnectorTypeLabel = (connectorType: string | null | undefined): string => {
    if (!connectorType) {
        return 'Unknown';
    }

    return CONNECTOR_TYPE_LABELS[connectorType] || connectorType;
};
