import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CarsService } from "./cars.service";

describe("CarsService", () => {
  let service: CarsService;
  let prisma: {
    director: { findUnique: jest.Mock };
    taxiPark: { findUnique: jest.Mock };
    car: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    driver: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let actionLogs: { createLog: jest.Mock };

  beforeEach(() => {
    prisma = {
      director: { findUnique: jest.fn() },
      taxiPark: { findUnique: jest.fn() },
      car: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      driver: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    actionLogs = { createLog: jest.fn() };
    service = new CarsService(prisma as any, actionLogs as any);
  });

  describe("listByTaxiPark", () => {
    it("returns mapped cars with assigned drivers", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.car.findMany.mockResolvedValue([
        {
          id: "car-1",
          firm: "Toyota",
          model: "Camry",
          type: "SEDAN",
          plateNumber: "A123BC77",
          state: "WORKING",
          taxiParkId: "park-1",
          assignedDriver: {
            id: "driver-1",
            userId: "user-1",
            user: { fullName: "Иван Иванов", email: "ivan@example.com" },
          },
        },
      ]);

      const result = await service.listByTaxiPark("director-user-1", "park-1");

      expect(prisma.car.findMany).toHaveBeenCalledWith({
        where: { taxiParkId: "park-1" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firm: true,
          model: true,
          type: true,
          plateNumber: true,
          state: true,
          taxiParkId: true,
          assignedDriver: {
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
      expect(result[0]).toEqual({
        id: "car-1",
        firm: "Toyota",
        model: "Camry",
        type: "SEDAN",
        plateNumber: "A123BC77",
        state: "WORKING",
        taxiParkId: "park-1",
        assignedDriver: {
          id: "driver-1",
          userId: "user-1",
          fullName: "Иван Иванов",
          email: "ivan@example.com",
        },
      });
    });

    it("rejects non-directors", async () => {
      prisma.director.findUnique.mockResolvedValue(null);

      await expect(service.listByTaxiPark("user-1", "park-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.car.findMany).not.toHaveBeenCalled();
    });
  });

  describe("assignDriver", () => {
    beforeEach(() => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.car.findUnique.mockResolvedValue({
        id: "car-1",
        taxiParkId: "park-1",
        assignedDriver: null,
        taxiPark: { directorId: "director-1" },
      });
    });

    it("assigns a valid driver", async () => {
      prisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        taxiParkId: "park-1",
        assignedCar: null,
      });
      prisma.car.update.mockResolvedValue({ id: "car-1", assignedDriverId: "driver-1" });

      const result = await service.assignDriver("director-user-1", "car-1", {
        driverId: "driver-1",
      });

      expect(prisma.driver.findUnique).toHaveBeenCalledWith({
        where: { id: "driver-1" },
        select: {
          id: true,
          taxiParkId: true,
          assignedCar: { select: { id: true } },
        },
      });
      expect(prisma.car.update).toHaveBeenCalledWith({
        where: { id: "car-1" },
        data: { assignedDriver: { connect: { id: "driver-1" } } },
      });
      expect(actionLogs.createLog).toHaveBeenCalledWith(
        "director-user-1",
        "ASSIGN_CAR",
        "Assign driver driver-1 to car car-1",
        "park-1",
        { carId: "car-1", driverId: "driver-1" },
      );
      expect(result).toEqual({ id: "car-1", assignedDriverId: "driver-1" });
    });

    it("unassigns driver with null", async () => {
      prisma.car.findUnique.mockResolvedValue({
        id: "car-1",
        taxiParkId: "park-1",
        assignedDriver: { id: "driver-1" },
        taxiPark: { directorId: "director-1" },
      });
      prisma.car.update.mockResolvedValue({ id: "car-1", assignedDriverId: null });

      const result = await service.assignDriver("director-user-1", "car-1", {
        driverId: null,
      });

      expect(prisma.driver.findUnique).not.toHaveBeenCalled();
      expect(prisma.car.update).toHaveBeenCalledWith({
        where: { id: "car-1" },
        data: { assignedDriver: { disconnect: true } },
      });
      expect(actionLogs.createLog).toHaveBeenCalledWith(
        "director-user-1",
        "ASSIGN_CAR",
        "Unassign driver from car car-1",
        "park-1",
        { carId: "car-1", driverId: null },
      );
      expect(result).toEqual({ id: "car-1", assignedDriverId: null });
    });

    it("is idempotent when unassigning an already empty car", async () => {
      prisma.car.update.mockResolvedValue({ id: "car-1", assignedDriverId: null });

      await service.assignDriver("director-user-1", "car-1", { driverId: null });

      expect(prisma.car.update).toHaveBeenCalledWith({
        where: { id: "car-1" },
        data: { assignedDriver: { disconnect: true } },
      });
    });

    it("rejects foreign taxi park drivers", async () => {
      prisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        taxiParkId: "park-2",
        assignedCar: null,
      });

      await expect(
        service.assignDriver("director-user-1", "car-1", { driverId: "driver-1" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects missing driverId", async () => {
      await expect(
        service.assignDriver("director-user-1", "car-1", { driverId: undefined as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects drivers outside taxi park access", async () => {
      prisma.car.findUnique.mockResolvedValue({
        id: "car-1",
        taxiParkId: "park-1",
        assignedDriver: null,
        taxiPark: { directorId: "another-director" },
      });

      await expect(
        service.assignDriver("director-user-1", "car-1", { driverId: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects missing cars", async () => {
      prisma.car.findUnique.mockResolvedValue(null);

      await expect(
        service.assignDriver("director-user-1", "car-1", { driverId: null }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects already assigned drivers or cars", async () => {
      prisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        taxiParkId: "park-1",
        assignedCar: { id: "car-2" },
      });

      await expect(
        service.assignDriver("director-user-1", "car-1", { driverId: "driver-1" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
