import { NextRequest } from "next/server";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const state = vi.hoisted(() => ({
  session: null as
    | {
        tenantId: string;
      }
    | null,

  project: null as
    | {
        id: string;
      }
    | null,

  units: [] as Array<{
    id: string;
    unitNumber: string;
    floorPosition: number | null;
    priceSar: number;
    status: string;
    area: string | null;
  }>,
}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),

  projectFindFirst: vi.fn(),
  projectCreate: vi.fn(),

  unitFindMany: vi.fn(),
  unitCreateMany: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findFirst: mocks.projectFindFirst,
      create: mocks.projectCreate,
    },

    unit: {
      findMany: mocks.unitFindMany,
      createMany: mocks.unitCreateMany,
    },
  },
}));

import { GET } from "@/app/api/v1/dashboard/units/route";

function request() {
  return new NextRequest(
    "http://localhost/api/v1/dashboard/units",
    {
      method: "GET",
    },
  );
}

describe(
  "dashboard units GET — read-only regression",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      state.session = {
        tenantId: "tenant-1",
      };

      state.project = {
        id: "project-1",
      };

      state.units = [];

      mocks.getSession.mockImplementation(
        async () => state.session,
      );

      mocks.projectFindFirst.mockImplementation(
        async () => state.project,
      );

      mocks.unitFindMany.mockImplementation(
        async () => state.units,
      );

      mocks.projectCreate.mockImplementation(
        async () => {
          throw new Error(
            "PROJECT_CREATE_MUST_NOT_BE_CALLED",
          );
        },
      );

      mocks.unitCreateMany.mockImplementation(
        async () => {
          throw new Error(
            "UNIT_CREATE_MANY_MUST_NOT_BE_CALLED",
          );
        },
      );
    });

    it(
      "returns 401 without an authenticated tenant and performs no database mutation",
      async () => {
        state.session = null;

        const response =
          await GET(request());

        expect(response.status).toBe(401);

        expect(
          mocks.projectFindFirst,
        ).not.toHaveBeenCalled();

        expect(
          mocks.unitFindMany,
        ).not.toHaveBeenCalled();

        expect(
          mocks.projectCreate,
        ).not.toHaveBeenCalled();

        expect(
          mocks.unitCreateMany,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "returns an empty success result when the tenant has no project and performs no bootstrap writes",
      async () => {
        state.project = null;

        const response =
          await GET(request());

        expect(response.status).toBe(200);

        expect(
          await response.json(),
        ).toEqual({
          success: true,
          data: [],
        });

        expect(
          mocks.projectFindFirst,
        ).toHaveBeenCalledTimes(1);

        expect(
          mocks.projectFindFirst,
        ).toHaveBeenCalledWith({
          where: {
            tenantId: "tenant-1",
          },
        });

        expect(
          mocks.unitFindMany,
        ).not.toHaveBeenCalled();

        expect(
          mocks.projectCreate,
        ).not.toHaveBeenCalled();

        expect(
          mocks.unitCreateMany,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "reads units for the selected project with the existing ordering and response contract, returning the persisted Unit.area for alphanumeric unit numbers",
      async () => {
        state.units = [
          {
            id: "unit-1",
            unitNumber: "V-001",
            floorPosition: 1,
            priceSar: 2200000,
            status: "Available",
            area: "180 م²",
          },
          {
            id: "unit-2",
            unitNumber: "A-001",
            floorPosition: 1,
            priceSar: 2650000,
            status: "Reserved",
            area: null,
          },
        ];

        const response =
          await GET(request());

        expect(response.status).toBe(200);

        expect(
          mocks.projectFindFirst,
        ).toHaveBeenCalledWith({
          where: {
            tenantId: "tenant-1",
          },
        });

        expect(
          mocks.unitFindMany,
        ).toHaveBeenCalledWith({
          where: {
            projectId: "project-1",
          },
          orderBy: [
            {
              floorPosition: "asc",
            },
            {
              unitNumber: "asc",
            },
          ],
        });

        expect(
          await response.json(),
        ).toEqual({
          success: true,
          data: [
            {
              id: "unit-1",
              unitNumber: "V-001",
              floorPosition: 1,
              priceSar: 2200000,
              status: "Available",
              area: "180 م²",
            },
            {
              id: "unit-2",
              unitNumber: "A-001",
              floorPosition: 1,
              priceSar: 2650000,
              status: "Reserved",
              area: null,
            },
          ],
        });

        expect(
          mocks.projectCreate,
        ).not.toHaveBeenCalled();

        expect(
          mocks.unitCreateMany,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
