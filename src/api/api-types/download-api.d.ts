
export interface ISnapshotBody {
    tstamp: string;
    id: string[];
};

export interface IPostZipDownloadBody {
    type: string;
    snapshot: ISnapshotBody;
};
