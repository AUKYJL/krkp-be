import { WorkDayStatus } from "@prisma/client";
import { WorkDaysSettlementService } from "./work-days-settlement.service";

describe("WorkDaysSettlementService", () => {
  let service: WorkDaysSettlementService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      driver: { findMany: jest.fn() },
      car: { findUnique: jest.fn() },
      workDay: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    service = new WorkDaysSettlementService(prisma);
  });

  it("creates downtime once for a driver without a work day", async () => {
    prisma.driver.findMany.mockResolvedValue([
      { id: "driver-1", assignedCarId: "car-1", taxiParkId: "park-1" },
    ]);
    prisma.car.findUnique.mockResolvedValue({
      id: "car-1",
      state: "WORKING",
      taxiParkId: "park-1",
    });
    prisma.workDay.findFirst.mockResolvedValue(null);
    prisma.workDay.create.mockResolvedValue({ id: "wd-1" });

    const result = await service.settleCurrentBusinessDay(new Date("2026-06-09T12:00:00.000Z"));

    expect(result).toEqual({ created: 1, updated: 0 });
    expect(prisma.workDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WorkDayStatus.DOWNTIME,
        }),
      }),
    );
  });

  it("does not touch profitable completed shifts", async () => {
    prisma.driver.findMany.mockResolvedValue([
      { id: "driver-1", assignedCarId: "car-1", taxiParkId: "park-1" },
    ]);
    prisma.car.findUnique.mockResolvedValue({
      id: "car-1",
      state: "WORKING",
      taxiParkId: "park-1",
    });
    prisma.workDay.findFirst.mockResolvedValue({
      id: "wd-1",
      status: WorkDayStatus.COMPLETED,
      revenue: "100",
      finishedAt: new Date(),
    });

    const result = await service.settleCurrentBusinessDay(new Date("2026-06-09T12:00:00.000Z"));

    expect(result).toEqual({ created: 0, updated: 0 });
    expect(prisma.workDay.update).not.toHaveBeenCalled();
  });
});
