import type { Exec007CutoverMode } from "../offer-management/state-machine";

export interface CutoverControl {
  mode: Exec007CutoverMode;
  authorizedReleaseSha: string | null;
  firstExec007WriteAt: Date | null;
  version: number;
}

export interface CutoverTransitionCommand {
  from: Exec007CutoverMode;
  to: Exec007CutoverMode;
  authorizedReleaseSha: string | null;
  expectedVersion: number;
  actorUserId: string;
  reason: string;
  evidenceHash: string;
}
