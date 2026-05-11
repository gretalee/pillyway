import { StageListItem } from './stage-list-item.dto';

export interface AdjacentStageSummary {
  stageNumber: number;
  startPointName: string;
  endPointName: string;
}

export interface StageDetail extends StageListItem {
  previousStage: AdjacentStageSummary | null;
  nextStage: AdjacentStageSummary | null;
}
