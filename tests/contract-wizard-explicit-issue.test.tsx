/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const clients = Array.from({ length: 9 }, (_, index) => ({
  id: `lead-${index + 1}`,
  name: `Client ${index + 1}`,
  phone: `05000000${String(index + 1).padStart(2, "0")}`,
  type: "lead" as const,
}));

const properties = Array.from({ length: 9 }, (_, index) => ({
  id: `unit-${index + 1}`,
  unitNumber: `U-${index + 1}`,
  priceSar: 1000000 + index * 10000,
  projectName: `Project ${index + 1}`,
}));

describe("ContractWizard explicit issuance regression", () => {
  beforeEach(() => {
    localStorage.clear();
    getDataMock.mockReset();
    issueMock.mockReset();

    getDataMock.mockResolvedValue({
      success: true,
      clients,
      properties,
    });

    issueMock.mockResolvedValue({
      success: false,
      code: "CONTRACT_ISSUE_FAILED",
    });
  });

  it("shows large client/property lists without typing and never issues on Next", async () => {
    render(
      <AppProvider>
        <Harness />
      </AppProvider>,
    );

    await screen.findByRole("heading", {
      name: "معالج إصدار العقود الذكي",
    });

    fireEvent.click(screen.getByTestId("toggle-language"));

    await screen.findByRole("heading", {
      name: "Smart Contract Issuance Wizard",
    });

    fireEvent.click(screen.getByLabelText("Select Client"));

    expect(
      screen.queryByText("Type at least two characters to search"),
    ).not.toBeInTheDocument();

    const clientOption = await screen.findByText(/Client 1/);
    fireEvent.mouseDown(clientOption);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(screen.getByLabelText("Select Property or Project"));

    expect(
      screen.queryByText("Type at least two characters to search"),
    ).not.toBeInTheDocument();

    const propertyOption = await screen.findByText(/Project 1/);
    fireEvent.mouseDown(propertyOption);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(issueMock).not.toHaveBeenCalled();

    const issueButton = screen.getByRole("button", {
      name: "Issue Contract",
    });

    fireEvent.click(issueButton);

    await waitFor(() => {
      expect(issueMock).toHaveBeenCalledTimes(1);
    });
  });
});