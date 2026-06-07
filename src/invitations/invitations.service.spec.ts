import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InvitationStatus, Prisma } from "@prisma/client";
import { InvitationsService } from "./invitations.service";

describe("InvitationsService", () => {
  let service: InvitationsService;
  let prisma: {
    director: { findUnique: jest.Mock };
    taxiPark: { findUnique: jest.Mock };
    driver: { findUnique: jest.Mock; update: jest.Mock };
    driverInvitation: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let actionLogs: { createLog: jest.Mock };

  beforeEach(() => {
    prisma = {
      director: { findUnique: jest.fn() },
      taxiPark: { findUnique: jest.fn() },
      driver: { findUnique: jest.fn(), update: jest.fn() },
      driverInvitation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    actionLogs = { createLog: jest.fn() };
    service = new InvitationsService(prisma as any, actionLogs as any);
  });

  describe("create", () => {
    it("creates invitation for director's taxi park", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.driver.findUnique.mockResolvedValue({ id: "driver-1", taxiParkId: null });
      prisma.driverInvitation.create.mockResolvedValue({
        id: "inv-1",
        taxiParkId: "park-1",
        driverId: "driver-1",
        status: InvitationStatus.PENDING,
      });

      const result = await service.create("director-user-1", "park-1", {
        driverId: "driver-1",
      });

      expect(result.id).toBe("inv-1");
      expect(prisma.driverInvitation.create).toHaveBeenCalledWith({
        data: { taxiParkId: "park-1", driverId: "driver-1" },
      });
    });

    it("rejects invitation to a foreign taxi park", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-2",
        directorId: "director-2",
      });

      await expect(
        service.create("director-user-1", "park-2", { driverId: "driver-1" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("throws not found for missing driver", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.create("director-user-1", "park-1", { driverId: "driver-1" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects invitation if driver is already in a taxi park", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        taxiParkId: "park-2",
      });

      await expect(
        service.create("director-user-1", "park-1", { driverId: "driver-1" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects duplicate invitation for the same taxi park and driver", async () => {
      prisma.director.findUnique.mockResolvedValue({ id: "director-1" });
      prisma.taxiPark.findUnique.mockResolvedValue({
        id: "park-1",
        directorId: "director-1",
      });
      prisma.driver.findUnique.mockResolvedValue({ id: "driver-1", taxiParkId: null });
      prisma.driverInvitation.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "6.11.1",
        }),
      );

      await expect(
        service.create("director-user-1", "park-1", { driverId: "driver-1" }),
      ).rejects.toThrow("Invitation already exists");
    });
  });

  describe("listMy", () => {
    it("returns invitation dto items with taxi park details", async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: "driver-1" });
      prisma.driverInvitation.findMany.mockResolvedValue([
        {
          id: "inv-1",
          status: InvitationStatus.PENDING,
          createdAt: new Date("2026-06-07T10:15:00.000Z"),
          taxiPark: {
            id: "park-1",
            name: "Таксопарк №1",
            address: "Москва, ул. Пушкина 1",
          },
        },
      ]);

      await expect(service.listMy("driver-user-1")).resolves.toEqual([
        {
          invitationId: "inv-1",
          status: InvitationStatus.PENDING,
          createdAt: new Date("2026-06-07T10:15:00.000Z"),
          taxiPark: {
            id: "park-1",
            name: "Таксопарк №1",
            address: "Москва, ул. Пушкина 1",
          },
        },
      ]);
    });
  });

  describe("accept", () => {
    it("accepts a pending invitation and assigns taxi park to the driver", async () => {
      prisma.driver.findUnique
        .mockResolvedValueOnce({ id: "driver-1" })
        .mockResolvedValueOnce({ id: "driver-1", taxiParkId: null });
      prisma.driverInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        driverId: "driver-1",
        taxiParkId: "park-1",
        status: InvitationStatus.PENDING,
      });
      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          driverInvitation: {
            update: jest.fn().mockResolvedValue({
              id: "inv-1",
              driverId: "driver-1",
              taxiParkId: "park-1",
              status: InvitationStatus.ACCEPTED,
            }),
          },
          driver: {
            update: jest.fn().mockResolvedValue({
              id: "driver-1",
              taxiParkId: "park-1",
            }),
          },
        }),
      );

      const result = await service.accept("driver-user-1", "inv-1");

      expect(result.status).toBe(InvitationStatus.ACCEPTED);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("rejects accepting non-pending invitations", async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: "driver-1" });
      prisma.driverInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        driverId: "driver-1",
        taxiParkId: "park-1",
        status: InvitationStatus.REJECTED,
      });

      await expect(service.accept("driver-user-1", "inv-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("rejects accepting someone else's invitation", async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: "driver-1" });
      prisma.driverInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        driverId: "driver-2",
        taxiParkId: "park-1",
        status: InvitationStatus.PENDING,
      });

      await expect(service.accept("driver-user-1", "inv-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("rejects accept when driver is already in a taxi park", async () => {
      prisma.driver.findUnique
        .mockResolvedValueOnce({ id: "driver-1" })
        .mockResolvedValueOnce({ id: "driver-1", taxiParkId: "park-2" });
      prisma.driverInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        driverId: "driver-1",
        taxiParkId: "park-1",
        status: InvitationStatus.PENDING,
      });

      await expect(service.accept("driver-user-1", "inv-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("reject", () => {
    it("rejects pending invitation", async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: "driver-1" });
      prisma.driverInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        driverId: "driver-1",
        taxiParkId: "park-1",
        status: InvitationStatus.PENDING,
      });
      prisma.driverInvitation.update.mockResolvedValue({
        id: "inv-1",
        driverId: "driver-1",
        taxiParkId: "park-1",
        status: InvitationStatus.REJECTED,
      });

      const result = await service.reject("driver-user-1", "inv-1");

      expect(result.status).toBe(InvitationStatus.REJECTED);
    });

    it("rejects non-pending invitation rejection", async () => {
      prisma.driver.findUnique.mockResolvedValue({ id: "driver-1" });
      prisma.driverInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        driverId: "driver-1",
        taxiParkId: "park-1",
        status: InvitationStatus.ACCEPTED,
      });

      await expect(service.reject("driver-user-1", "inv-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
