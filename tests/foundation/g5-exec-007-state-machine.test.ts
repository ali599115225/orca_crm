import { describe, expect, it } from "vitest";
import {
  canTransitionApproval,
  canTransitionCompletion,
  canTransitionCutover,
  canTransitionIntent,
  canTransitionOffer,
  canTransitionVersion,
} from "@/lib/offer-management/state-machine";

describe("EXEC-007 closed state machines", () => {
  it("T-SM-01 allows only documented offer and version transitions", () => {
    expect(canTransitionOffer("DRAFT", "OPEN")).toBe(true);
    expect(canTransitionOffer("CLOSED", "OPEN")).toBe(false);
    expect(canTransitionVersion("DRAFT", "PENDING_APPROVAL")).toBe(true);
    expect(canTransitionVersion("ISSUED", "DRAFT")).toBe(false);
  });

  it("T-SM-02 keeps terminal approval and intent states terminal", () => {
    expect(canTransitionApproval("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionApproval("REJECTED", "APPROVED")).toBe(false);
    expect(canTransitionIntent("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionIntent("CONFIRMED", "PENDING")).toBe(false);
  });

  it("T-SM-03 makes completion terminal and cutover forward-fix only after first write", () => {
    expect(canTransitionCompletion("PENDING", "FAILED")).toBe(true);
    expect(canTransitionCompletion("FAILED", "PENDING")).toBe(false);
    expect(canTransitionCutover("EXEC007_ACTIVE", "LEGACY_ONLY")).toBe(false);
    expect(canTransitionCutover("EXEC007_ACTIVE", "RECOVERY_STOP")).toBe(true);
  });
});
