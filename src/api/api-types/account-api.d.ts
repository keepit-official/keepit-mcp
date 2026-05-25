interface IGetUserResponseObject {
    enabled: boolean;
    created: string;
    product?: string;
    parent?: string;
    deletion?: string;
    subscribed?: boolean;
    external_id?: string;
}

interface IProduct {
    id: string;
    name: string;
}

interface ISubaccountListItemV3 {
    id: string;
    created: string;
    parent_id?: string;
    'deletion-deadline'?: string;
    contact?: IContact;
}

interface IPortfolioResource {
    name: string;
    group: string;
    type: 'period' | 'date' | 'integer' | 'boolean';
    descr: string;
    unit?: string;
    category?: string;
}

interface IResource {
    evaluated: string;
    name: string;
    type: string;
    usage: number;
    violated: boolean;
}

interface IContact {
    email?: string;
    companyname?: string;
    fullname?: string;
    phone?: string;
    vatnumber?: string;
    country?: string;
    state?: string;
}
