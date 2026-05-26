import type { VizType } from '../enums/viz-type.enum';

export interface FieldRef {
  field: string;
  label?: string;
}

export interface BinSpec {
  size: number;
}

export interface BarEncoding {
  x: FieldRef;
  y: FieldRef;
}

export interface GroupedBarEncoding {
  x: FieldRef;
  y: FieldRef;
  series: FieldRef;
}

export interface TimeSeriesEncoding {
  x: FieldRef & { field: 'year' | 'month' };
  y: FieldRef;
  series?: FieldRef;
}

export interface HistogramEncoding {
  x: FieldRef & { bin: BinSpec };
  y: { field: 'count'; label?: string };
}

export interface ScatterEncoding {
  x: FieldRef;
  y: FieldRef;
  size?: FieldRef;
  color?: FieldRef;
}

export interface NetworkEncoding {
  nodes: {
    id_field: 'id';
    label_field: 'label';
    group_field: 'type';
  };
  edges: {
    source_field: 'source';
    target_field: 'target';
    weight_field: 'weight';
  };
}

export interface GeoEncoding {
  location: { field: 'country' };
  value: { field: 'trial_count' };
}

export type Encoding =
  | BarEncoding
  | GroupedBarEncoding
  | TimeSeriesEncoding
  | HistogramEncoding
  | ScatterEncoding
  | NetworkEncoding
  | GeoEncoding;

export type NodeType = 'sponsor' | 'drug' | 'condition' | 'investigator' | 'site';

export interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  size?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export type DataPoint = Record<string, string | number | undefined>;

export interface VisualizationSpec {
  type: VizType;
  title: string;
  encoding: Encoding;
  data: DataPoint[] | NetworkData;
}
