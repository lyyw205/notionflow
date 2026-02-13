export type PropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "person"
  | "relation"
  | "formula";

export type ViewType =
  | "table"
  | "board"
  | "timeline"
  | "calendar"
  | "list"
  | "gallery"
  | "chart"
  | "feed"
  | "map";

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

export interface SelectConfig {
  options: SelectOption[];
}

export interface NumberConfig {
  format?: "number" | "currency" | "percent";
}

export interface DateConfig {
  includeTime?: boolean;
}

export interface RelationConfig {
  targetDatabaseId: string;
}

export interface FormulaConfig {
  expression: string;
}

export interface ChartViewConfig {
  chartType: "bar" | "pie" | "line";
  xAxis?: string; // propertyId
  yAxis?: string; // propertyId
  aggregation?: "count" | "sum" | "average";
}

export interface BoardViewConfig {
  kanbanProperty?: string; // propertyId (select type)
}

export interface CalendarViewConfig {
  dateProperty?: string; // propertyId (date type)
}

export interface TimelineViewConfig {
  startDateProperty?: string; // propertyId
  endDateProperty?: string; // propertyId
}

export interface MapViewConfig {
  latProperty?: string; // propertyId (number type)
  lngProperty?: string; // propertyId (number type)
}

export type ViewConfig =
  | ChartViewConfig
  | BoardViewConfig
  | CalendarViewConfig
  | TimelineViewConfig
  | MapViewConfig
  | Record<string, unknown>;

export interface DatabaseProperty {
  id: string;
  databaseId: string;
  name: string;
  type: PropertyType;
  config: SelectConfig | NumberConfig | DateConfig | RelationConfig | FormulaConfig | null;
  sortOrder: number;
  isTitle: number;
  createdAt: number;
}

export interface DatabaseRecord {
  id: string;
  databaseId: string;
  values: Record<string, unknown>;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface DatabaseView {
  id: string;
  databaseId: string;
  name: string;
  type: ViewType;
  config: ViewConfig | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Database {
  id: string;
  name: string;
  description: string | null;
  pageId: string;
  createdBy: string;
  properties: DatabaseProperty[];
  records: DatabaseRecord[];
  views: DatabaseView[];
  createdAt: number;
  updatedAt: number;
}

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  table: "테이블",
  board: "보드",
  timeline: "타임라인",
  calendar: "캘린더",
  list: "리스트",
  gallery: "갤러리",
  chart: "차트",
  feed: "피드",
  map: "지도",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  text: "텍스트",
  number: "숫자",
  select: "선택",
  multi_select: "다중 선택",
  date: "날짜",
  checkbox: "체크박스",
  url: "URL",
  email: "이메일",
  phone: "전화번호",
  person: "사람",
  relation: "관계",
  formula: "수식",
};

export const SELECT_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

export type SelectColor = (typeof SELECT_COLORS)[number];

export const COLOR_CLASSES: Record<SelectColor, { bg: string; text: string }> = {
  gray: { bg: "bg-gray-100", text: "text-gray-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700" },
  green: { bg: "bg-green-100", text: "text-green-700" },
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  pink: { bg: "bg-pink-100", text: "text-pink-700" },
};
