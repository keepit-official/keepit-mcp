import { ConnectorGuidSchema } from '../schemas/entities/connector.schemas.js';

/**
 * Validates and sanitizes connector GUID to prevent injection attacks
 * Keepit connector GUIDs follow the format: xxxxxx-xxxxxx-xxxxxx (6-6-6 alphanumeric characters)
 */
export function validateAndSanitizeConnectorId (connectorId: string): string {
    const validationResult = ConnectorGuidSchema.safeParse(connectorId);
    if (!validationResult.success) {
        throw new Error(`Invalid Keepit connector GUID format. Expected format: xxxxxx-xxxxxx-xxxxxx (example: 0m34mt-wny3i2-o5fjvo). Received: ${connectorId}`);
    }
    return validationResult.data.toLowerCase();
}
