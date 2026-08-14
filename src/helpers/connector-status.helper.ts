import type { IDeviceStatus, TCloudType } from '../api/api-types/connectors-api.js';


export const getConnectorFailureReason = ({ ecode, status }: IDeviceStatus, deviceType: TCloudType): string => {
    if (deviceType === 'sforce' && status === '7') {
        return 'Your backup has stopped because your API request limit has been reached. To resume the backup, in your connector configuration increase the percentage of API requests that we use. Keep in mind that this can affect performance';
    };

    switch (ecode) {
        case 'E_START':
            return "We're unable to start your backup due to an unexpected issue. Please contact Support, and we'll investigate to ensure everything is working properly.";
        case 'E_LOGIN':
        case 'E_REVOKED':
            return 'Backup has stopped because the authentication between your connector and the SaaS application is no longer valid. To resume backups, please reauthenticate the connector';
        case 'E_TERM':
            return 'Connector job was aborted.';
        case 'E_INITIAL_CONFIGURATION_PENDING':
            return 'Backup not scheduled. Configure connector and click Start backup.';
        case 'E_QUOTA':
            return 'Your backup has stopped because one or more of your seat limits has been exceeded. Adjust your backup configuration or add more seats.';
        case 'E_INCOMPLETE_CONNECTOR_CONFIG':
            switch (deviceType) {
                case 'azure-ad':
                    return 'Entra ID groups and/or administrative units missing from backup configuration';
                case 'azure-do':
                    return 'Azure DevOps organizations missing from backup configuration ';
                case 'gsuite':
                    return 'Google Workspace groups and/or organizational units missing from backup configuration';
                case 'o365-admin':
                    return 'Entra ID groups missing from backup configuration. ';
                default:
                    return 'Entra ID groups missing from backup configuration. ';
            }
        case 'E_EMPTY_ROOT':
            return "We couldn't start your backup because no organization was found. Please make sure you're signed in with the correct admin account and that it has a the required license and data access.";
        case 'E_LOGIN_ADMIN':
            return 'Authentication failed. Sign in with global adming account with proper permissions.';
        case 'E_WORKLOADS_WITH_MISSING_PLANS_PRESENT_CRITICAL':
            return "We're unable to back up your data because all data areas selected in the configuration are unlicensed in Microsoft. Add the appropriate Microsoft licenses to your tenant and reauthenticate the connector.";
        case 'E_WORKLOADS_WITH_MISSING_PLANS_PRESENT_UNHEALTHY':
            return "We're unable to backup some data areas selected in the configuration as they are unlicensed in Microsoft and we can't back them up. Add the appropriate Microsoft licenses to your tenant and reauthenticate the connector.";
        case 'E_DEDICATED_APP_IS_NOT_PRESENT_CRITICAL':
            return "Your backup isn't running because Teams chats is the only selected data, and it requires an app registration. Create an app registration in Entra ID to back up Teams chats data.";
        case 'E_DEDICATED_APP_IS_NOT_PRESENT_UNHEALTHY':
            return 'Your backup is running, but Teams chats are not being backed up. To include Teams chat data, create an app registration in Entra ID';
        case 'E_CONFIG':
            return 'Connector configuration is invalid.';
        case 'E_CONNECT':
            return 'Cannot connect.';
        case 'E_READ':
            return 'Read error.';
        case 'E_WRITE':
            return 'Write error.';
        default:
            return 'Unable to start backup.';
    }
};

const SUPPORT_URL = 'https://help.keepit.com/support/tickets/new';

// Keys are ecodes returned by the backend API.
// SFORCE_API_LIMIT is a synthetic key — NOT a real backend ecode.
// It represents the Salesforce API limit case (status=7, no ecode from the API).
const CONNECTOR_SOLUTION_LINKS: Record<string, string | Record<string, string>> = {
    SFORCE_API_LIMIT: 'https://www.keepit.com/help/salesforce-category/your-salesforce-api-requests-usage/',

    E_LOGIN: {
        'o365-admin': 'https://www.keepit.com/help/microsoft-365-category/my-microsoft-365-connectors-authentication-is-no-longer-valid/',
        default: 'https://www.keepit.com/help/platform-category/reauthenticate-a-connector-when-authentication-is-no-longer-valid/'
    },
    E_REVOKED: {
        'o365-admin': 'https://www.keepit.com/help/microsoft-365-category/my-microsoft-365-connectors-authentication-is-no-longer-valid/',
        default: 'https://www.keepit.com/help/platform-category/reauthenticate-a-connector-when-authentication-is-no-longer-valid/'
    },

    E_INCOMPLETE_CONNECTOR_CONFIG: {
        'azure-ad': 'https://www.keepit.com/help/entra-id-category/entra-id-objects-are-missing-from-my-backup-configuration/',
        'azure-do': 'https://www.keepit.com/help/azure-devops-category/azure-devops-organizations-are-missing-from-my-backup-configuration/',
        'gsuite': 'https://www.keepit.com/help/google-workspace-category/google-workspace-objects-are-missing-from-my-backup-configuration/',
        'o365-admin': 'https://www.keepit.com/help/microsoft-365-category/entra-id-groups-are-missing-from-my-backup-configuration/'
    },

    E_WORKLOADS_WITH_MISSING_PLANS_PRESENT_CRITICAL: 'https://www.keepit.com/help/microsoft-365-category/tenant-missing-microsoft-365-licenses/',
    E_WORKLOADS_WITH_MISSING_PLANS_PRESENT_UNHEALTHY: 'https://www.keepit.com/help/microsoft-365-category/tenant-missing-microsoft-365-licenses/',

    E_DEDICATED_APP_IS_NOT_PRESENT_CRITICAL: 'https://www.keepit.com/help/microsoft-365-category/create-an-app-registration-in-entra-id/',
    E_DEDICATED_APP_IS_NOT_PRESENT_UNHEALTHY: 'https://www.keepit.com/help/microsoft-365-category/create-an-app-registration-in-entra-id/'
};

export const getConnectorSolutionLink = (ecode: string, connectorType?: string): string => {
    const entry = CONNECTOR_SOLUTION_LINKS[ecode];

    if (!entry) return SUPPORT_URL;
    if (typeof entry === 'string') return entry;

    const typeSpecific = connectorType ? entry[connectorType] : undefined;
    return typeSpecific ?? entry.default ?? SUPPORT_URL;
};
