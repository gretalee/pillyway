export interface StagePointSummary {
  id: string;
  name: string;
  country: string;
}

export interface AdjacentStageSummary {
  stageNumber: number;
  startPointName: string;
  endPointName: string;
}

export interface StageListItem {
  id: string;
  stageNumber: number;
  startPoint: StagePointSummary;
  endPoint: StagePointSummary;
  distance: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StageDetail {
  id: string;
  stageNumber: number;
  startPoint: StagePointSummary;
  endPoint: StagePointSummary;
  distance: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  previousStage: AdjacentStageSummary | null;
  nextStage: AdjacentStageSummary | null;
}

export interface UpdateStagePayload {
  distance?: number | null;
  description?: string | null;
}
