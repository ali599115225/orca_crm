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

describe("ContractWizard language behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    getDataMock.mockReset();
    issueMock.mockReset();
    getDataMock.mockResolvedValue({
      success: true,
      clients: [],
      properties: [],
    });
  });

  it("changes all visible wizard labels while the dialog remains open", async () => {
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
    expect(screen.getByText("العميل")).toBeInTheDocument();
    expect(screen.getByText("العقار")).toBeInTheDocument();
    expect(screen.getByText("المبلغ")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle-language"));

    expect(
      await screen.findByRole("heading", {
        name: "Smart Contract Issuance Wizard",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
    expect(screen.getByText("Property")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("never exposes the internal tenant error token", async () => {
    getDataMock.mockResolvedValue({
      success: false,
      code: "TENANT_CONTEXT_UNAVAILABLE",
      clients: [],
      properties: [],
    });

    render(
      <AppProvider>
        <Harness />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "تعذر تحديد منشأة الحساب. أعد تحميل الصفحة ثم حاول مرة أخرى.",
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText("TENANT_CONTEXT_REQUIRED"),
    ).not.toBeInTheDocument();
  });
});
