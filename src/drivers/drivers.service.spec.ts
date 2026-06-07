import { ForbiddenException } from "@nestjs/common";
import { DriversService } from "./drivers.service";

describe("DriversService", () => {
  let service: DriversService;
  let prisma: {
    director: { findUnique: jest.Mock };
    driver: { findMany: jest.Mock };
    car: { findUnique: jest.Mock };
  };
  let actionLogs: { createLog: jest.Mock };

  beforeEach(() => {
    prisma = {
      director: { findUnique: jest.fn() },
      driver: { findMany: jest.fn() },
      car: { findUnique: jest.fn() },
    };
    actionLogs = { createLog: jest.fn() };
    service = new DriversService(prisma as any, actionLogs as any);
  });

  describe("search", () => {
    it("returns mapped drivers for directors with full name and taxi park filters", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.driver.findMany.mockResolvedValue([
        {
          id: "driver-1",
          taxiParkId: "park-1",
          user: {
            id: "user-1",
            fullName: "Иван Иванов",
            email: "ivan@example.com",
          },
        },
      ]);

      const result = await service.search("director-user-1", {
        fullName: "Иван",
        inTaxiPark: true,
      });

      expect(prisma.driver.findMany).toHaveBeenCalledWith({
        where: {
          user: {
            fullName: {
              contains: "Иван",
              mode: "insensitive",
            },
          },
          taxiParkId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          taxiParkId: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });
      expect(result).toEqual([
        {
          driverId: "driver-1",
          userId: "user-1",
          fullName: "Иван Иванов",
          email: "ivan@example.com",
          isInTaxiPark: true,
          assignedTaxiParkId: "park-1",
        },
      ]);
    });

    it("filters drivers outside taxi parks", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.driver.findMany.mockResolvedValue([]);

      await service.search("director-user-1", { inTaxiPark: false });

      expect(prisma.driver.findMany).toHaveBeenCalledWith({
        where: {
          taxiParkId: null,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          taxiParkId: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });
    });

    it("rejects non-directors", async () => {
      prisma.director.findUnique.mockResolvedValue(null);

      await expect(service.search("driver-user-1", {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.driver.findMany).not.toHaveBeenCalled();
    });
  });
});
