type TMonitoringDiagramCategory =
    | 'imported-files-added'
    | 'imported-files-removed'
    | 'imported-files-modified'
    | 'total-snapshot-size'
    | 'snapshot-coverage';

interface IMonitoringDiagramParams {
    from?: string;
    to?: string;
    samples?: number;
    left_margin?: number;
    right_margin?: number;
    raw?: boolean;
    force_margins?: boolean;
}

interface IAggregatedMonitoringDiagramParams extends IMonitoringDiagramParams {
    type: TCloudType;
}

// RAW Diagrams response interfaces
interface IMonitoringDiagramsRawResponse {
    diagrams: {
        graph: IDiagramRawGraph | IDiagramRawGraph[];
    };
}

interface IDiagramRawGraph {
    name: string;
    axes: {
        axis: IDiagramAxis | IDiagramAxis[];
    };
    datasets: {
        dataset: IMonitoringRawDataset | IMonitoringRawDataset[];
    };
}

interface IMonitoringRawDataset {
    name: string;
    axes: {
        axis: string | string[];
    };
    points: {
        p: IMonitoringRawPoint | IMonitoringRawPoint[];
    };
}

interface IMonitoringRawPoint {
    v: string | string[];
}
// END of RAW Diagrams response interfaces

interface IMonitoringDiagram {
    name: string;
    axes: IDiagramAxis[];
    datasets: IMonitoringDataset[];
}

interface IDiagramAxis {
    name: string;
    caption: string;
    unit?: string;
}

interface IMonitoringDataset {
    name: string;
    axes?: string[];
    points: string[][];
}

interface IMonitoringBackupSummaryParams {
    raw?: boolean;
}

interface IAggregatedBackupSummaryParams extends IMonitoringBackupSummaryParams {
    type?: TCloudType;
}

interface IGetAggregatedLatestBackupSummary {
    'backup-summary': {
        device: IAggregatedLatestBackupSummaryObject[];
    };
}

interface IAggregatedLatestBackupSummaryObject extends IMonitoringBackupSummaryObject {
    guid: string;
}

interface IGetMonitoringBackupSummary {
    'backup-summary': IMonitoringBackupSummaryObject;
}

interface IMonitoringBackupSummaryObject {
    'last-snapshot-time': string;
    'last-complete-snapshot-time'?: string;
    'last-snapshot-size': string;
    'size-change': string;
}
