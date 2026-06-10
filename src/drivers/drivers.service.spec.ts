import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { DriversService } from "./drivers.service";

describe("DriversService", () => {
  let service: DriversService;
  let prisma: {
    director: { findUnique: jest.Mock };
    driver: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    car: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let actionLogs: { createLog: jest.Mock };

  beforeEach(() => {
    prisma = {
      director: { findUnique: jest.fn() },
      driver: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      car: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
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

  describe("list", () => {
    it("returns drivers with assigned cars and taxi park names", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.driver.findMany.mockResolvedValue([
        {
          id: "driver-1",
          userId: "user-1",
          user: {
            fullName: "Иван Иванов",
            email: "ivan@example.com",
          },
          taxiParkId: "park-1",
          taxiPark: {
            name: "Central Park Fleet",
          },
          assignedCar: {
            id: "car-1",
            firm: "Toyota",
            model: "Camry",
            type: "SEDAN",
            plateNumber: "A123BC77",
            state: "WORKING",
            taxiParkId: "park-1",
          },
        },
      ]);

      const result = await service.list("director-user-1");

      expect(prisma.driver.findMany).toHaveBeenCalledWith({
        where: { taxiPark: { directorId: "director-1" } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
          taxiParkId: true,
          taxiPark: {
            select: {
              name: true,
            },
          },
          assignedCar: {
            select: {
              id: true,
              firm: true,
              model: true,
              type: true,
              plateNumber: true,
              state: true,
              taxiParkId: true,
            },
          },
        },
      });
      expect(result).toEqual([
        {
          id: "driver-1",
          userId: "user-1",
          fullName: "Иван Иванов",
          email: "ivan@example.com",
          taxiParkId: "park-1",
          taxiParkName: "Central Park Fleet",
          assignedCar: {
            id: "car-1",
            firm: "Toyota",
            model: "Camry",
            type: "SEDAN",
            plateNumber: "A123BC77",
            state: "WORKING",
            taxiParkId: "park-1",
          },
        },
      ]);
    });

    it("returns null taxi park name when the relation is absent", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.driver.findMany.mockResolvedValue([
        {
          id: "driver-2",
          userId: "user-2",
          user: {
            fullName: "Петр Петров",
            email: "petr@example.com",
          },
          taxiParkId: "park-2",
          taxiPark: null,
          assignedCar: null,
        },
      ]);

      const result = await service.list("director-user-1");

      expect(result).toEqual([
        {
          id: "driver-2",
          userId: "user-2",
          fullName: "Петр Петров",
          email: "petr@example.com",
          taxiParkId: "park-2",
          taxiParkName: null,
          assignedCar: null,
        },
      ]);
    });
  });

  describe("assignCar", () => {
    beforeEach(() => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        taxiParkId: "park-1",
        assignedCarId: null,
        taxiPark: { directorId: "director-1" },
      });
    });

    it("assigns a valid car", async () => {
      prisma.car.findUnique.mockResolvedValue({
        id: "car-1",
        taxiParkId: "park-1",
        assignedDriver: null,
      });
      prisma.driver.update.mockResolvedValue({ id: "driver-1", assignedCarId: "car-1" });

      const result = await service.assignCar("director-user-1", "driver-1", {
        carId: "car-1",
      });

      expect(prisma.car.findUnique).toHaveBeenCalledWith({
        where: { id: "car-1" },
        select: {
          id: true,
          taxiParkId: true,
          assignedDriver: { select: { id: true } },
        },
      });
      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: "driver-1" },
        data: { assignedCarId: "car-1" },
      });
      expect(actionLogs.createLog).toHaveBeenCalledWith(
        "director-user-1",
        "ASSIGN_CAR",
        "Assign car car-1 to driver driver-1",
        "park-1",
        { driverId: "driver-1", carId: "car-1" },
      );
      expect(result).toEqual({ id: "driver-1", assignedCarId: "car-1" });
    });

    it("unassigns car with null", async () => {
      prisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        taxiParkId: "park-1",
        assignedCarId: "car-1",
        taxiPark: { directorId: "director-1" },
      });
      prisma.driver.update.mockResolvedValue({ id: "driver-1", assignedCarId: null });

      const result = await service.assignCar("director-user-1", "driver-1", {
        carId: null,
      });

      expect(prisma.car.findUnique).not.toHaveBeenCalled();
      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: "driver-1" },
        data: { assignedCarId: null },
      });
      expect(actionLogs.createLog).toHaveBeenCalledWith(
        "director-user-1",
        "ASSIGN_CAR",
        "Unassign car from driver driver-1",
        "park-1",
        { driverId: "driver-1", carId: null },
      );
      expect(result).toEqual({ id: "driver-1", assignedCarId: null });
    });

    it("is idempotent when unassigning an already empty driver", async () => {
      prisma.driver.update.mockResolvedValue({ id: "driver-1", assignedCarId: null });

      await service.assignCar("director-user-1", "driver-1", { carId: null });

      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: "driver-1" },
        data: { assignedCarId: null },
      });
    });

    it("rejects foreign taxi park cars", async () => {
      prisma.car.findUnique.mockResolvedValue({
        id: "car-1",
        taxiParkId: "park-2",
        assignedDriver: null,
      });

      await expect(
        service.assignCar("director-user-1", "driver-1", { carId: "car-1" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects missing carId", async () => {
      await expect(
        service.assignCar("director-user-1", "driver-1", { carId: undefined as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects drivers outside taxi park access", async () => {
      prisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        taxiParkId: "park-1",
        assignedCarId: null,
        taxiPark: { directorId: "another-director" },
      });

      await expect(
        service.assignCar("director-user-1", "driver-1", { carId: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects missing drivers", async () => {
      prisma.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.assignCar("director-user-1", "driver-1", { carId: null }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
