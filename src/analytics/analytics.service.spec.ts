import { UserRole, WorkDayStatus } from "@prisma/client";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService driver dashboard aggregation", () => {
  let service: AnalyticsService;
  let prisma: {
    user: { findUnique: jest.Mock };
    driver: { findUnique: jest.Mock; findMany: jest.Mock };
    workDay: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      driver: { findUnique: jest.fn(), findMany: jest.fn() },
      workDay: { findMany: jest.fn() },
    };
    service = new AnalyticsService(prisma as any);
  });

  const arrangeDriverDashboard = () => {
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.DRIVER });
    prisma.driver.findUnique.mockResolvedValue({
      id: "driver-1",
      user: { fullName: "Ivan Ivanov" },
      taxiParkId: "park-1",
      taxiPark: { id: "park-1", name: "Taxi Park 1" },
      assignedCar: {
        id: "car-1",
        firm: "Toyota",
        model: "Camry",
        plateNumber: "A123AA77",
        state: "ACTIVE",
      },
    });
    prisma.driver.findMany.mockResolvedValue([
      {
        id: "driver-1",
        user: { fullName: "Ivan Ivanov" },
      },
      {
        id: "driver-2",
        user: { fullName: "Petr Petrov" },
      },
    ]);
  };

  it("sums revenue by calendar day and keeps one chart point per day", async () => {
    arrangeDriverDashboard();
    prisma.workDay.findMany.mockResolvedValue([
      {
        id: "wd-1",
        driverId: "driver-1",
        workDate: new Date("2026-06-01T08:00:00.000Z"),
        revenue: "100",
        carOnLine: true,
        status: WorkDayStatus.COMPLETED,
        car: {
          id: "car-1",
          firm: "Toyota",
          model: "Camry",
          plateNumber: "A123AA77",
        },
      },
      {
        id: "wd-2",
        driverId: "driver-1",
        workDate: new Date("2026-06-01T18:00:00.000Z"),
        revenue: "250",
        carOnLine: false,
        status: WorkDayStatus.DOWNTIME,
        car: {
          id: "car-1",
          firm: "Toyota",
          model: "Camry",
          plateNumber: "A123AA77",
        },
      },
    ]);

    const result = await service.getDriverDashboard("user-1", {
      from: "2026-06-01",
      to: "2026-06-01",
    } as any);

    expect(result.summary).toMatchObject({
      totalRevenue: 350,
      workDaysCount: 1,
      onlineDaysCount: 1,
      downtimeDaysCount: 0,
      activityRate: 100,
      downtimeRate: 0,
    });
    expect(result.charts.revenueByDay).toEqual([
      {
        date: "2026-06-01",
        revenue: 350,
        carOnLine: true,
      },
    ]);
    expect(result.workDays).toHaveLength(2);
  });

  it("counts a mixed day as online when at least one shift is online", async () => {
    arrangeDriverDashboard();
    prisma.workDay.findMany.mockResolvedValue([
      {
        id: "wd-1",
        driverId: "driver-1",
        workDate: new Date("2026-06-02T08:00:00.000Z"),
        revenue: "120",
        carOnLine: false,
        status: WorkDayStatus.DOWNTIME,
        car: {
          id: "car-1",
          firm: "Toyota",
          model: "Camry",
          plateNumber: "A123AA77",
        },
      },
      {
        id: "wd-2",
        driverId: "driver-1",
        workDate: new Date("2026-06-02T14:00:00.000Z"),
        revenue: "80",
        carOnLine: true,
        status: WorkDayStatus.COMPLETED,
        car: {
          id: "car-1",
          firm: "Toyota",
          model: "Camry",
          plateNumber: "A123AA77",
        },
      },
    ]);

    const result = await service.getDriverDashboard("user-1", {
      from: "2026-06-02",
      to: "2026-06-02",
    } as any);

    expect(result.summary).toMatchObject({
      workDaysCount: 1,
      onlineDaysCount: 1,
      downtimeDaysCount: 0,
      activityRate: 100,
      downtimeRate: 0,
    });
    expect(result.charts.revenueByDay).toEqual([
      {
        date: "2026-06-02",
        revenue: 200,
        carOnLine: true,
      },
    ]);
  });

  it("keeps downtime day counts stable and avoids divide-by-zero when there are no online days", async () => {
    arrangeDriverDashboard();
    const workDays = [
      {
        id: "wd-1",
        driverId: "driver-1",
        workDate: new Date("2026-06-03T08:00:00.000Z"),
        revenue: "0",
        carOnLine: false,
        status: WorkDayStatus.DOWNTIME,
        car: {
          id: "car-1",
          firm: "Toyota",
          model: "Camry",
          plateNumber: "A123AA77",
        },
      },
      {
        id: "wd-2",
        driverId: "driver-1",
        workDate: new Date("2026-06-04T08:00:00.000Z"),
        revenue: "50",
        carOnLine: false,
        status: WorkDayStatus.DOWNTIME,
        car: {
          id: "car-1",
          firm: "Toyota",
          model: "Camry",
          plateNumber: "A123AA77",
        },
      },
    ];
    prisma.workDay.findMany.mockResolvedValueOnce(workDays).mockResolvedValueOnce(workDays);

    const result = await service.getDriverDashboard("user-1", {
      from: "2026-06-03",
      to: "2026-06-04",
    } as any);

    expect(result.summary).toMatchObject({
      totalRevenue: 50,
      workDaysCount: 2,
      onlineDaysCount: 0,
      downtimeDaysCount: 2,
      averageRevenuePerShift: 0,
      activityRate: 0,
      downtimeRate: 100,
    });
    expect(result.scorecard).toMatchObject({
      revenueScore: 100,
      activityScore: 0,
      stabilityScore: 0,
    });
    expect(result.charts.revenueByDay).toEqual([
      {
        date: "2026-06-03",
        revenue: 0,
        carOnLine: false,
      },
      {
        date: "2026-06-04",
        revenue: 50,
        carOnLine: false,
      },
    ]);
  });
});
