import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { WorkDayStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LOG_EVENTS } from "../shared/consts/log-events";
import { AssignCarDto } from "./dto/assign-car.dto";
import { DriverListItemDto } from "./dto/driver-list-item.dto";
import { SearchDriversQueryDto } from "./dto/search-drivers-query.dto";
import { UpdateDriverDto } from "./dto/update-driver.dto";

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private actionLogs: ActionLogsService,
  ) {}

  private async getDirectorIdByUserId(userId: string) {
    const director = await this.prisma.director.findUnique({
      where: { userId },
    });
    if (!director) throw new ForbiddenException("Only director allowed");
    return director.id;
  }

  private async assertDirectorDriverAccess(userId: string, driverId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        taxiPark: { select: { directorId: true } },
      },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (!driver.taxiPark || driver.taxiPark.directorId !== directorId) {
      throw new ForbiddenException();
    }
    return driver;
  }

  async list(userId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const drivers = await this.prisma.driver.findMany({
      where: { taxiPark: { directorId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        user: { select: { fullName: true, email: true } },
        taxiParkId: true,
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
    return drivers.map((driver) => ({
      id: driver.id,
      userId: driver.userId,
      fullName: driver.user.fullName,
      email: driver.user.email,
      taxiParkId: driver.taxiParkId,
      assignedCar: driver.assignedCar,
    })) as DriverListItemDto[];
  }

  async search(userId: string, query: SearchDriversQueryDto) {
    await this.getDirectorIdByUserId(userId);

    return this.prisma.driver.findMany({
      where: {
        ...(query.fullName
          ? {
              user: {
                fullName: {
                  contains: query.fullName,
                  mode: "insensitive",
                },
              },
            }
          : {}),
        ...(query.inTaxiPark === undefined
          ? {}
          : query.inTaxiPark
            ? { taxiParkId: { not: null } }
            : { taxiParkId: null }),
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
    }).then((drivers) =>
      drivers.map((driver) => ({
        driverId: driver.id,
        userId: driver.user.id,
        fullName: driver.user.fullName,
        email: driver.user.email,
        isInTaxiPark: Boolean(driver.taxiParkId),
        assignedTaxiParkId: driver.taxiParkId ?? undefined,
      })),
    );
  }

  async get(userId: string, driverId: string) {
    await this.assertDirectorDriverAccess(userId, driverId);
    return this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async getMe(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        taxiPark: { select: { id: true, name: true, address: true } },
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
        workDays: {
          where: { status: WorkDayStatus.ACTIVE },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            id: true,
            workDate: true,
            startedAt: true,
            finishedAt: true,
            revenue: true,
            carOnLine: true,
            status: true,
            carId: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    const activeWorkDay = driver.workDays[0] ?? null;
    return {
      ...driver,
      isOnLine: Boolean(activeWorkDay && activeWorkDay.status === WorkDayStatus.ACTIVE),
      activeWorkDay,
    };
  }

  async update(userId: string, driverId: string, dto: UpdateDriverDto) {
    await this.assertDirectorDriverAccess(userId, driverId);
    return this.prisma.driver.update({
      where: { id: driverId },
      data: dto,
    });
  }

  async remove(userId: string, driverId: string) {
    const driver = await this.assertDirectorDriverAccess(userId, driverId);
    const deleted = await this.prisma.driver.delete({ where: { id: driverId } });
    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.DISMISS_DRIVER,
      `Dismiss driver ${driverId}`,
      driver.taxiParkId ?? undefined,
      { driverId },
    );
    return deleted;
  }

  async assignCar(userId: string, driverId: string, dto: AssignCarDto) {
    const driver = await this.assertDirectorDriverAccess(userId, driverId);
    if (!driver.taxiParkId) throw new BadRequestException("Driver has no taxi park");
    if (dto.carId === undefined) throw new BadRequestException("carId is required");

    if (dto.carId === null) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const existingDriver = await tx.driver.findUnique({
          where: { id: driverId },
          select: { assignedCarId: true, taxiParkId: true },
        });
        if (!existingDriver) throw new NotFoundException("Driver not found");
        if (existingDriver.taxiParkId !== driver.taxiParkId) {
          throw new BadRequestException("Driver must belong to same taxi park");
        }

        return tx.driver.update({
          where: { id: driverId },
          data: { assignedCarId: null },
        });
      });

      await this.actionLogs.createLog(
        userId,
        LOG_EVENTS.ASSIGN_CAR,
        `Unassign car from driver ${driverId}`,
        driver.taxiParkId,
        { driverId, carId: null },
      );

      return updated;
    }

    const carId = dto.carId;
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      select: {
        id: true,
        taxiParkId: true,
        assignedDriver: { select: { id: true } },
      },
    });
    if (!car) throw new NotFoundException("Car not found");
    if (car.taxiParkId !== driver.taxiParkId) {
      throw new BadRequestException("Car must belong to same taxi park");
    }
    if (car.assignedDriver) throw new BadRequestException("Car already assigned");
    if (driver.assignedCarId) throw new BadRequestException("Driver already has car");

    const updated = await this.prisma.$transaction(async (tx) => {
      const existingCar = await tx.car.findUnique({
        where: { id: carId },
        include: {
          assignedDriver: { select: { id: true } },
        },
      });
      if (!existingCar) throw new NotFoundException("Car not found");
      if (existingCar.taxiParkId !== driver.taxiParkId) {
        throw new BadRequestException("Car must belong to same taxi park");
      }
      if (existingCar.assignedDriver) throw new BadRequestException("Car already assigned");

      const existingDriver = await tx.driver.findUnique({
        where: { id: driverId },
        select: { assignedCarId: true, taxiParkId: true },
      });
      if (!existingDriver) throw new NotFoundException("Driver not found");
      if (existingDriver.taxiParkId !== driver.taxiParkId) {
        throw new BadRequestException("Driver must belong to same taxi park");
      }
      if (existingDriver.assignedCarId) throw new BadRequestException("Driver already has car");

      return tx.driver.update({
        where: { id: driverId },
        data: { assignedCarId: dto.carId },
      });
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.ASSIGN_CAR,
      `Assign car ${dto.carId} to driver ${driverId}`,
      driver.taxiParkId,
      { driverId, carId: dto.carId },
    );

    return updated;
  }
}
