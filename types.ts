
export type DataItem = Record<string, any>;

export interface ColumnDef {
  key: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface PivotConfig {
  rowKey: string;
  colKey: string;
  valueKey: string;
  aggregation: 'sum' | 'count' | 'average' | 'min' | 'max';
}

export interface ReportChart {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'pivot';
  dataKey?: string;
  xAxisKey?: string;
  title: string;
  pivotConfig?: PivotConfig;
}

export interface PivotSuggestion {
  title: string;
  description: string;
  config: PivotConfig;
}

export interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  instruction: string;
  icon: 'trend' | 'finance' | 'audit' | 'general';
}

export enum AppView {
  HOME = 'HOME',
  SPREADSHEET = 'SPREADSHEET',
  DASHBOARD = 'DASHBOARD',
  PIVOT = 'PIVOT',
  REPORT = 'REPORT',
  HISTORY = 'HISTORY',
  PDF_CONVERTER = 'PDF_CONVERTER',
  IMAGE_MAPPER = 'IMAGE_MAPPER',
  WORKSPACE = 'WORKSPACE',
  SETTINGS = 'SETTINGS',
  ACTIVITY = 'ACTIVITY'
}

export type ReportStage = 'analysis' | 'drafting';

export interface AppState {
  data: DataItem[];
  columns: ColumnDef[];
  reportContent: string;
  reportStage: ReportStage;
  preReportAnalysis: string;
  view: AppView;
  isAiThinking: boolean;
  reportCharts: ReportChart[];
}
