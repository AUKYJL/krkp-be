import { ForbiddenException } from "@nestjs/common";
import { TaxiParksService } from "./taxi-parks.service";

describe("TaxiParksService", () => {
  let service: TaxiParksService;
  let prisma: {
    director: { findUnique: jest.Mock };
    taxiPark: { findUnique: jest.Mock };
    driver: { findMany: jest.Mock };
  };
  let actionLogs: { createLog: jest.Mock };

  beforeEach(() => {
    prisma = {
      director: { findUnique: jest.fn() },
      taxiPark: { findUnique: jest.fn() },
      driver: { findMany: jest.fn() },
    };
    actionLogs = { createLog: jest.fn() };
    service = new TaxiParksService(prisma as any, actionLogs as any);
  });

  describe("listDrivers", () => {
    it("returns only drivers for the requested taxi park", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.driver.findMany.mockResolvedValue([
        {
          id: "driver-1",
          user: {
            id: "user-1",
            fullName: "Иван Иванов",
            email: "ivan@example.com",
          },
        },
      ]);

      const result = await service.listDrivers("director-user-1", "park-1");

      expect(prisma.driver.findMany).toHaveBeenCalledWith({
        where: { taxiParkId: "park-1" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
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
        },
      ]);
    });

    it("rejects access when the taxi park belongs to another director", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-2",
      });

      await expect(
        service.listDrivers("director-user-1", "park-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.driver.findMany).not.toHaveBeenCalled();
    });

    it("returns an empty array when the taxi park has no drivers", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.driver.findMany.mockResolvedValue([]);

      await expect(
        service.listDrivers("director-user-1", "park-1"),
      ).resolves.toEqual([]);
    });

    it("maps the response to the compact dto shape only", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.driver.findMany.mockResolvedValue([
        {
          id: "driver-1",
          taxiParkId: "park-1",
          createdAt: new Date(),
          user: {
            id: "user-1",
            fullName: "Иван Иванов",
            email: "ivan@example.com",
            role: "DRIVER",
          },
          taxiPark: { id: "park-1" },
          assignedCarId: "car-1",
        },
      ]);

      const result = await service.listDrivers("director-user-1", "park-1");

      expect(result).toEqual([
        {
          driverId: "driver-1",
          userId: "user-1",
          fullName: "Иван Иванов",
          email: "ivan@example.com",
        },
      ]);
      expect(Object.keys(result[0] ?? {})).toEqual([
        "driverId",
        "userId",
        "fullName",
        "email",
      ]);
    });
  });
});
