import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CarState } from "@prisma/client";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { PrismaService } from "../prisma/prisma.service";
import { LOG_EVENTS } from "../shared/consts/log-events";
import { CreateCarDto } from "./dto/create-car.dto";
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
    return this.prisma.car.findMany({
      where: { taxiParkId },
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
