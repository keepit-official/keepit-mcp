interface IGetTokensParams {
    capabilities?: 1 | undefined;
    secondary?: 1 | undefined;
}

interface IAuthToken {
    acl: string;
    aname: string;
    created: string;
    descr: string;
    eacl: string;
    guid: string;
    lastuse: string;
    primary: boolean;
    primary_aname: string;
    lifetime: string;
    capabilities: string;
    capability: string;
    expires?: string;
    device?: string;
}

type IAuthTokenShort = Omit<IAuthToken, 'capabilities'>;

interface IAccountInfo {
    id: string;
    enabled: boolean;
    created: string;
    product: string;
    parent: string;
    subscribed: boolean;
};
