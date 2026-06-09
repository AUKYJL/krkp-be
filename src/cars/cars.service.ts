import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CarState } from "@prisma/client";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { PrismaService } from "../prisma/prisma.service";
import { LOG_EVENTS } from "../shared/consts/log-events";
import { AssignDriverDto } from "./dto/assign-driver.dto";
import { CreateCarDto } from "./dto/create-car.dto";
import { CarListItemDto } from "./dto/car-list-item.dto";
import { UpdateCarDto } from "./dto/update-car.dto";

@Injectable()
export class CarsService {
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

  private async assertDirectorTaxiParkAccess(userId: string, taxiParkId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const taxiPark = await this.prisma.taxiPark.findUnique({
      where: { id: taxiParkId },
      select: { id: true, directorId: true },
    });
    if (!taxiPark) throw new NotFoundException("Taxi park not found");
    if (taxiPark.directorId !== directorId) throw new ForbiddenException();
  }

  async create(userId: string, taxiParkId: string, dto: CreateCarDto) {
    await this.assertDirectorTaxiParkAccess(userId, taxiParkId);
    const car = await this.prisma.car.create({
      data: { ...dto, taxiParkId, state: dto.state ?? CarState.WORKING },
      include: {
        assignedDriver: {
          select: {
            id: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.CREATE_CAR,
      `Create car ${car.plateNumber}`,
      taxiParkId,
      { carId: car.id },
    );
    return car;
  }

  async listByTaxiPark(userId: string, taxiParkId: string) {
    await this.assertDirectorTaxiParkAccess(userId, taxiParkId);
    const cars = await this.prisma.car.findMany({
      where: { taxiParkId },
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
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });
    return cars.map((car) => ({
      ...car,
      assignedDriver: car.assignedDriver
        ? {
            id: car.assignedDriver.id,
            userId: car.assignedDriver.userId,
            fullName: car.assignedDriver.user.fullName,
            email: car.assignedDriver.user.email,
          }
        : null,
    })) as CarListItemDto[];
  }

  async listAvailableByTaxiPark(userId: string, taxiParkId: string) {
    await this.assertDirectorTaxiParkAccess(userId, taxiParkId);
    return this.prisma.car.findMany({
      where: {
        taxiParkId,
        assignedDriver: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        assignedDriver: {
          select: {
            id: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
  }

  async getAsDirector(userId: string, carId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      include: {
        taxiPark: { select: { directorId: true } },
        assignedDriver: {
          select: {
            id: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!car) throw new NotFoundException("Car not found");
    if (car.taxiPark.directorId !== directorId) throw new ForbiddenException();
    return car;
  }

  async getAsDriver(userId: string, carId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { assignedCarId: true },
    });
    if (!driver?.assignedCarId) throw new ForbiddenException();
    if (driver.assignedCarId !== carId) throw new ForbiddenException();
    const car = await this.prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new NotFoundException("Car not found");
    return car;
  }

  async update(userId: string, carId: string, dto: UpdateCarDto) {
    const car = await this.getAsDirector(userId, carId);
    const updated = await this.prisma.car.update({
      where: { id: carId },
      data: dto,
      include: {
        assignedDriver: {
          select: {
            id: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.UPDATE_CAR,
      `Update car ${updated.plateNumber}`,
      car.taxiParkId,
      { carId: updated.id },
    );
    return updated;
  }

  async updateState(userId: string, carId: string, state: CarState) {
    const car = await this.getAsDirector(userId, carId);
    const updated = await this.prisma.car.update({
      where: { id: carId },
      data: { state },
      include: {
        assignedDriver: {
          select: {
            id: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.CHANGE_CAR_STATE,
      `Change car state to ${state} for ${updated.plateNumber}`,
      car.taxiParkId,
      { carId: updated.id, state },
    );
    return updated;
  }

  async assignDriver(userId: string, carId: string, dto: AssignDriverDto) {
    const car = await this.getAsDirector(userId, carId);
    if (dto.driverId === undefined) throw new BadRequestException("driverId is required");

    if (dto.driverId === null) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const existingCar = await tx.car.findUnique({
          where: { id: carId },
          select: { taxiParkId: true, assignedDriver: { select: { id: true } } },
        });
        if (!existingCar) throw new NotFoundException("Car not found");
        if (existingCar.taxiParkId !== car.taxiParkId) {
          throw new BadRequestException("Car must belong to same taxi park");
        }

        return tx.car.update({
          where: { id: carId },
          data: { assignedDriver: { disconnect: true } },
        });
      });

      await this.actionLogs.createLog(
        userId,
        LOG_EVENTS.ASSIGN_CAR,
        `Unassign driver from car ${carId}`,
        car.taxiParkId,
        { carId, driverId: null },
      );

      return updated;
    }

    const driverId = dto.driverId;
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        taxiParkId: true,
        assignedCar: { select: { id: true } },
      },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (driver.taxiParkId !== car.taxiParkId) {
      throw new BadRequestException("Driver must belong to same taxi park");
    }
    if (driver.assignedCar) throw new BadRequestException("Driver already has car");
    if (car.assignedDriver) throw new BadRequestException("Car already assigned");

    const updated = await this.prisma.$transaction(async (tx) => {
      const existingCar = await tx.car.findUnique({
        where: { id: carId },
        include: {
          assignedDriver: { select: { id: true } },
        },
      });
      if (!existingCar) throw new NotFoundException("Car not found");
      if (existingCar.taxiParkId !== car.taxiParkId) {
        throw new BadRequestException("Car must belong to same taxi park");
      }
      if (existingCar.assignedDriver) throw new BadRequestException("Car already assigned");

      const existingDriver = await tx.driver.findUnique({
        where: { id: driverId },
        select: { assignedCarId: true, taxiParkId: true },
      });
      if (!existingDriver) throw new NotFoundException("Driver not found");
      if (existingDriver.taxiParkId !== car.taxiParkId) {
        throw new BadRequestException("Driver must belong to same taxi park");
      }
      if (existingDriver.assignedCarId) throw new BadRequestException("Driver already has car");

      return tx.car.update({
        where: { id: carId },
        data: { assignedDriver: { connect: { id: driverId } } },
      });
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.ASSIGN_CAR,
      `Assign driver ${driverId} to car ${carId}`,
      car.taxiParkId,
      { carId, driverId },
    );

    return updated;
  }

  async remove(userId: string, carId: string) {
    const car = await this.getAsDirector(userId, carId);
    const deleted = await this.prisma.car.delete({ where: { id: carId } });
    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.DELETE_CAR,
      `Delete car ${deleted.plateNumber}`,
      car.taxiParkId,
      { carId: deleted.id },
    );
    return deleted;
  }
}
