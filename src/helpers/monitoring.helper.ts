import { XMLParser } from 'fast-xml-parser';
import xmlParseOptions from './fast-xml-parser-options.js';
import { normalizeArrayResponse } from './fetch.helper.js';

const Parser = new XMLParser(xmlParseOptions);

export const getNormalizedMonitoringData = (response: string): IMonitoringDiagram[] => {
    const parsedData: IMonitoringDiagramsRawResponse = Parser.parse(response);
    const normalizedGraphsArray = normalizeArrayResponse(parsedData.diagrams.graph);

    return normalizedGraphsArray.map(rawGraph => ({
        ...rawGraph,
        axes: normalizeArrayResponse(rawGraph.axes.axis),
        datasets: normalizeArrayResponse(rawGraph.datasets.dataset).map(dataset => ({
            ...dataset,
            ...dataset.axes && { axes: normalizeArrayResponse(dataset.axes.axis) },
            points: normalizeArrayResponse(dataset.points.p)
                .map(point => normalizeArrayResponse(point.v))
        }))
    }));
};
