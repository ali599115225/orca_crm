/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDataMock, issueMock } = vi.hoisted(() => ({
  getDataMock: vi.fn(),
  issueMock: vi.fn(),
}));

vi.mock("@/app/actions/contract", () => ({
  getContractWizardDataAction: getDataMock,
  issueContractActionDirect: issueMock,
}));

import { AppProvider, useApp } from "@/app/context/AppContext";
import ContractWizard from "@/components/features/ContractWizard";

function Harness() {
  const { toggleLang } = useApp();

  return (
    <>
      <button type="button" data-testid="toggle-language" onClick={toggleLang}>
        toggle
      </button>

      <ContractWizard isOpen onClose={vi.fn()} />
    </>
  );
}

describe("Dashboard contract wizard page-closure localization", () => {
  beforeEach(() => {
    localStorage.clear();
    getDataMock.mockReset();
    issueMock.mockReset();

    getDataMock.mockResolvedValue({
      success: true,
      clients: [
        {
          id: "lead-faisal",
          name: "فيصل الشمري",
          phone: "0545556667",
          type: "lead",
        },
        {
          id: "lead-sarah",
          name: "سارة العتيبي",
          phone: "0553334445",
          type: "lead",
        },
        {
          id: "lead-sulaiman",
          name: "سليمان الحربي",
          phone: "0501112223",
          type: "lead",
        },
      ],
      properties: [
        {
          id: "unit-yasmin",
          unitNumber: "A-101",
          priceSar: 1250000,
          projectName: "واحة الياسمين",
        },
      ],
    });
  });

  it("localizes all dynamic select values while the wizard remains open", async () => {
    render(
      <AppProvider>
        <Harness />
      </AppProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "معالج إصدار العقود الذكي",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle-language"));

    expect(
      await screen.findByRole("heading", {
        name: "Smart Contract Issuance Wizard",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Select Client"));

    expect(
      await screen.findByText(/Faisal Al-Shammari/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sarah Al-Otaibi/)).toBeInTheDocument();
    expect(screen.getByText(/Sulaiman Al-Harbi/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Select Property or Project"));

    expect(
      await screen.findByText(/Al-Yasmin Oasis/),
    ).toBeInTheDocument();

    await waitFor(() => {
      const visibleText = document.body.textContent || "";

      expect(visibleText).not.toContain("فيصل الشمري");
      expect(visibleText).not.toContain("سارة العتيبي");
      expect(visibleText).not.toContain("سليمان الحربي");
      expect(visibleText).not.toContain("واحة الياسمين");
    });
  });
});
