interface IGetUserResponseObject {
    enabled: boolean;
    created: string;
    product?: string;
    parent?: string;
    deletion?: string;
    subscribed?: boolean;
    external_id?: string;
    company?: string;
    companyname?: string;
    name?: string;
    displayname?: string;
    'display-name'?: string;
}

interface IPrimaryContactResponseObject {
    fullname?: string;
    email?: string;
    companyname?: string;
    company_name?: string;
    language?: string;
    type?: string;
}
