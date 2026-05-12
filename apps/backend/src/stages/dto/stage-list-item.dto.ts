export interface StagePointSummary {
  id: string;
  name: string;
  country: string;
}

export interface StageListItem {
  id: string;
  stageNumber: number;
  startPoint: StagePointSummary;
  endPoint: StagePointSummary;
  distance: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
