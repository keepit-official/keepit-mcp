import type { IAuthConfig } from './auth-config.helper';

export const findUserToken = (tokens: IAuthTokenShort[], keepitLogin: string): IAuthTokenShort => {
    const foundToken = tokens.find(token => token.aname === keepitLogin);

    if (!foundToken) {
        throw new Error('We could not find user\'s token.');
    }
    return foundToken;
};

export const checkIfPartnerRole = (role: IAuthConfig['userRole']): role is keyof typeof PMC_ROLES_MAP => {
    return role in PMC_ROLES_MAP;
};

export const PMC_ROLES_MAP = {
    PartnerParent: 'PartnerParent',
    MSPPartner: 'MSPPartner',
    MSPSupport: 'MSPSupport',
    ReadOnlyMSPPartner: 'ReadOnlyMSPPartner',
    Reseller: 'Reseller',
    ResellerLimitedAdmin: 'ResellerLimitedAdmin',
    ReadOnlyReseller: 'ReadOnlyReseller',
    // Internal roles
    SupportLead: 'SupportLead',
    L1Support: 'L1Support',
    L2Support: 'L2Support',
    SalesEngineer: 'SalesEngineer'
};
