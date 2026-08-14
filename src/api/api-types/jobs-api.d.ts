interface JobsResponse {
    result: IJob[];
    success: boolean;
    errors: Error[];
    messages: string[];
}

type TRestoreJobTypes = 'srestore' | 'restore' | 'pstrestore' | 'zipdownload' | 'pmrestore';
export type TJobType = 'backup' | TRestoreJobTypes;

export interface IJob {
    guid: string;
    active: boolean;
    description: string;
    dispatched?: string;
    failed?: string;
    succeeded?: string;
    progress?: number;
    scheduled: string;
    start: string;
    comment?: string;
    started?: string;
    cancelled?: string;
    type?: TJobType[];
    token?: string;
    stats?: {
        stat: IJobStatistic | IJobStatistic[];
    };
    commands?: {
        restore: IRestoreJobConfig;
    };
}

interface IRestoreJobConfig {
    RestoreConfig: {
        SnapshotId?: string;
        SnapshotTimestamp?: string;
        SourceAccount?: string;
        SourceDevice?: string;
        RestoreName?: string;
        Rules: IRestoreConfigRules;
    };
}

interface IPostRestoreConfigCsvFileResponse {
    restoreconfig: {
        devicename: string;
        root: string;
        filename: string;
    };
}

interface IJobStatistic {
    name: string;
    value: string;
}

type TFolderRestoreMode = 'DeltaAppend' | 'DeltaRestore';
type TFileConflictResolutionMode = 'Skip' | 'Rename' | 'Restore';
type TRestoreMethod = 'ToFolder' | 'InPlace';
type TRestoreTargetLocation = 'Source' | 'Other' | 'Any';
interface IRestoreConfigMode {
    FolderRestoreMode: TFolderRestoreMode;
    FileConflictResolutionMode: TFileConflictResolutionMode;
    RestoreGroups?: string[];
    Method: TRestoreMethod;
    TargetLocation?: TRestoreTargetLocation;
}
/**
 * O365 section
 */
type TO365RestoreWizardDataArea = 'Exchange' | 'PublicFolders' | 'OneDrive' | 'Sites' | 'SharePoint' | 'Groups';
type TExchangeAreaType = 'mail' | 'calendar' | 'contacts' | 'tasks' | 'inPlaceArchive';
type TGroupsTeamsAreaType = 'conversations' | 'calendar' | 'plan' | 'files' | 'members' | 'owners' | 'sharePoint' | 'channels';
type TMsVersionsRestoreMode = 'RestoreLatestVersionOnly' | 'RecreateDocument';
interface IMsVersionsRestoreType {
    RestoreLatestVersionOnly?: object;
    RecreateDocument?: object;
}
type TO365RestoreCategories = Record<TO365RestoreWizardDataArea[number] | Capitalize<TExchangeAreaType[number]> | Capitalize<TGroupsTeamsAreaType[number]>, ''>;
interface IO365BaseRestoreRule {
    SourceId: string;
}
type TSharePointProcessingMode = 'Traverse' | 'Restore' | 'RestoreRecursively';
interface ISharePointRestoreConfig {
    Url: string;
    Id: string;
    Name: string;
    UrlToRelocate?: string;
    NameToRelocate?: string;
    ProcessingMode?: TSharePointProcessingMode;
    SubSites?: {
        Site: ISharePointRestoreConfig | ISharePointRestoreConfig[];
    };
}
interface ISkipSharePointSiteForRestoreConfig {
    Url: string;
}
interface ISharePointRestoreRules extends IMsVersionsRestoreType {
    RestoreEverything?: 'true' | 'false';
    Site?: ISharePointRestoreConfig | ISharePointRestoreConfig[];
    SitesToSkip?: {
        Site: ISkipSharePointSiteForRestoreConfig | ISkipSharePointSiteForRestoreConfig[];
    };
}
interface IGroupsTeamsRestoreRules {
    Options: {
        RestoreCategories: TO365RestoreCategories;
    };
    Group: IO365BaseRestoreRule[];
}
interface IUserRestoreConfig {
    SourceId: string;
    TargetId?: string;
}
interface IExchangeOneDriveUserRestoreRules extends IMsVersionsRestoreType {
    Options: {
        RestoreCategories: TO365RestoreCategories;
    };
    User: IUserRestoreConfig | IUserRestoreConfig[];
}
interface ISitesRestoreConfig {
    URL: string | string[];
    SubSites?: {
        Site: ISitesRestoreConfig | ISitesRestoreConfig[];
    };
}
interface ISitesRestoreRules {
    Site: ISitesRestoreConfig[];
}
interface IPublicFolderRestoreConfig {
    Name: string;
}
interface IPublicFolderRestoreRules {
    RestoreEverything?: 'true' | 'false';
    Folder?: IPublicFolderRestoreConfig[];
}
/**
 * end of O365 section
 */
interface IRestoreConfigRules {
    /**
     * leave this section for now just for backward compatibility
     */
    RestoreSites?: IRestoreConfig;
    RestoreSharePoint?: IRestoreConfig;
    /**
     * end of this temporary section
     */
    RestorePaths?: {
        Path: string | string[];
    };
    /** o365 restore section */
    OneDriveRestoreMode?: IMsVersionsRestoreType;
    RestoreSharePoint?: ISharePointRestoreRules;
    SharePointRestoreMode?: IMsVersionsRestoreType;
    RestoreGroups?: IGroupsTeamsRestoreRules;
    RestoreUsers?: IExchangeOneDriveUserRestoreRules;
    RestoreSites?: ISitesRestoreRules;
    RestorePublicFolders?: IPublicFolderRestoreRules;
    /** end of o365 restore section */
    Mode?: IRestoreConfigMode;
    EnvironmentRestoreInfo?: {
        SourceEnvironmentType: string;
        TargetEnvironmentType: string;
    };
}

interface IPutSkippedItemsLogBody {
    and: Record<string, { arg: string[]; }>;
}

interface IGetDeviceJobsCountParams {
    from: string;
    'job-types'?: TJobType[];
    to?: string;
}

interface IGetDeviceJobsStatusesCountParams extends Omit<IGetDeviceJobsCountParams, 'job-types'> {
    'job-types': JobTypes[];
}

interface IGetWorkloadJobsStatusesCountParams extends IGetDeviceJobsStatusesCountParams {
    'device-type': TCloudType;
}

interface IGetWorkloadSuccessfulJobsCountParams extends IGetDeviceJobsCountParams {
    'device-type'?: TCloudType;
}

interface IDeviceJobsStatutesCountObject {
    name: TJobType;
    scheduled: number;
    'in-progress': number;
    cancelled: number;
    successful: number;
    incomplete: number;
    unsuccessful: number;
}

interface IDeviceJobsStatutesCount {
    guid: string;
    'job-types': IDeviceJobsStatutesCountObject[];
}

interface IDeviceJobsStatutesCountResponse {
    'jobs-count': {
        'job-type': IDeviceJobsStatutesCountObject | IDeviceJobsStatutesCountObject[];
    };
}

interface IWorkloadSingleDeviceJobsStatutesResponse {
    'guid': string;
    'counts': {
        'job-type': IDeviceJobsStatutesCountObject | IDeviceJobsStatutesCountObject[];
    };
}

interface IWorkloadJobsStatutesCountResponse {
    'jobs-count': {
        'device': IWorkloadSingleDeviceJobsStatutesResponse | IWorkloadSingleDeviceJobsStatutesResponse[];
    };
}

interface IWorkloadJobsCountData {
    'jobs-count': {
        guid: string;
        counts: IDeviceJobsStatutesCountObject[];
    }[];
}

interface IDeviceSuccessfulJobsCountObject {
    guid?: string;
    automatic: number;
    manual: number;
}

interface IGetWorkloadSuccessfulJobsCount {
    'jobs-count': {
        device: IDeviceSuccessfulJobsCountObject | IDeviceSuccessfulJobsCountObject[];
    };
}

interface IGetDeviceSuccessfulJobsCount {
    'jobs-count': IDeviceSuccessfulJobsCountObject;
}

interface IGetFilteredJobsBody {
    'from-time': string;
    'to-time'?: string;
    type?: JobTypes;
    types?: {
        type: JobTypes[];
    };
    limit?: number;
    reverse?: boolean;
    stats?: {
        name: string | string[];
    };
    'active-only'?: string;
}
