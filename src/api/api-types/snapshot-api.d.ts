export interface IDeviceSnapshot {
    account?: string;
    size: string;
    tstamp: string;
    type: 'p' | 'c';
}

export interface ISnapshotRange {
    timestamp: string;
    type: string;
    size: string;
    account: string;
};

export interface IGetDeviceRangeBody {
    start: string; // ISO timestamp
    span?: string; // ISO timespan
    count?: number; // max 99 (API limit)
    resolution?: string; // ISO timespan, minimum interval between snapshots
    type?: 'c' | 'p'; // return only partial or complete snapshots
    reverse?: boolean; // reverse the query (cannot be used if resolution is used)
}

export type LatestSnapshotRequest = z.infer<typeof LatestSnapshotRequestSchema>;
export type SnapshotRangeRequest = z.infer<typeof SnapshotRangeRequestSchema>;
