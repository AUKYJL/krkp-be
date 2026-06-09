import { BadRequestException } from "@nestjs/common";
import { CarState, WorkDayStatus } from "@prisma/client";
import { WorkDaysService } from "./work-days.service";

describe("WorkDaysService", () => {
  let service: WorkDaysService;
  let prisma: any;
  let actionLogs: { createLog: jest.Mock };

  beforeEach(() => {
    prisma = {
      director: { findUnique: jest.fn() },
      driver: { findUnique: jest.fn(), findMany: jest.fn() },
      car: { findUnique: jest.fn() },
      workDay: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    actionLogs = { createLog: jest.fn() };
    service = new WorkDaysService(prisma, actionLogs as any);
  });

  it("creates an active work day", async () => {
    prisma.driver.findUnique.mockResolvedValue({
      id: "driver-1",
      assignedCarId: "car-1",
      taxiParkId: "park-1",
    });
    prisma.car.findUnique.mockResolvedValue({
      id: "car-1",
      state: CarState.WORKING,
      taxiParkId: "park-1",
    });
    prisma.workDay.findFirst.mockResolvedValue(null);
    prisma.workDay.create.mockResolvedValue({
      id: "wd-1",
      status: WorkDayStatus.ACTIVE,
    });

    const result = (await service.create("user-1", {})) as any;

    expect(result.status).toBe(WorkDayStatus.ACTIVE);
    expect(prisma.workDay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WorkDayStatus.ACTIVE,
          carOnLine: true,
        }),
      }),
    );
  });

  it("finishes a profitable shift as completed", async () => {
    prisma.driver.findUnique.mockResolvedValue({ id: "driver-1", assignedCarId: "car-1" });
    prisma.workDay.findUnique.mockResolvedValue({
      id: "wd-1",
      driverId: "driver-1",
      carId: "car-1",
      revenue: "125",
      status: WorkDayStatus.ACTIVE,
    });
    prisma.workDay.update.mockResolvedValue({
      id: "wd-1",
      status: WorkDayStatus.COMPLETED,
    });

    const result = (await service.finishMy("user-1", "wd-1")) as any;

    expect(result.status).toBe(WorkDayStatus.COMPLETED);
    expect(prisma.workDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wd-1" },
        data: expect.objectContaining({ status: WorkDayStatus.COMPLETED }),
      }),
    );
  });

  it("finishes a zero-revenue shift as downtime", async () => {
    prisma.driver.findUnique.mockResolvedValue({ id: "driver-1", assignedCarId: "car-1" });
    prisma.workDay.findUnique.mockResolvedValue({
      id: "wd-1",
      driverId: "driver-1",
      carId: "car-1",
      revenue: "0",
      status: WorkDayStatus.ACTIVE,
    });
    prisma.workDay.update.mockResolvedValue({
      id: "wd-1",
      status: WorkDayStatus.DOWNTIME,
    });

    const result = (await service.finishMy("user-1", "wd-1")) as any;

    expect(result.status).toBe(WorkDayStatus.DOWNTIME);
  });

  it("rejects updates after completion", async () => {
    prisma.driver.findUnique.mockResolvedValue({ id: "driver-1", assignedCarId: "car-1" });
    prisma.workDay.findUnique.mockResolvedValue({
      id: "wd-1",
      driverId: "driver-1",
      carId: "car-1",
      revenue: "0",
      status: WorkDayStatus.COMPLETED,
    });

    await expect(service.updateMy("user-1", "wd-1", {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
