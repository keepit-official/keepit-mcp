import { AccountIdSchema } from '../schemas/entities/account.schemas.js';

export function validateAccountId(accountId: string): void {
    const result = AccountIdSchema.safeParse(accountId);
    if (!result.success) {
        const messages = result.error.errors.map(e => e.message).join(', ');
        throw new Error(`Invalid account ID "${accountId}": ${messages}`);
    }
}
