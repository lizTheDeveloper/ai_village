/**
 * Data transformation utilities for metrics dashboard
 */

export function transformNetworkData(apiData: any) {
  if (!apiData || !apiData.nodes || !apiData.edges) {
    throw new Error('Invalid network data format');
  }
  return apiData;
}

export function transformTimelineData(apiData: any) {
  if (!apiData || !apiData.behaviors) {
    throw new Error('Invalid timeline data format');
  }
  return apiData;
}

export function transformSpatialData(apiData: any) {
  if (!apiData || !apiData.density) {
    throw new Error('Invalid spatial data format');
  }
  return apiData;
}

export function transformInequalityData(apiData: any) {
  if (!apiData || !apiData.lorenzCurve) {
    throw new Error('Invalid inequality data format');
  }
  return apiData;
}

export function transformCulturalData(apiData: any) {
  if (!apiData || !apiData.sankeyData) {
    throw new Error('Invalid cultural data format');
  }
  return apiData;
}

export function transformTimeSeriesData(apiData: any) {
  if (!apiData || !apiData.metrics) {
    throw new Error('Invalid time series data format');
  }
  return apiData;
}
