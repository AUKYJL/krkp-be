import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CarState } from "@prisma/client";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWorkDayDto } from "./dto/create-work-day.dto";
import { UpdateWorkDayDto } from "./dto/update-work-day.dto";

@Injectable()
export class WorkDaysService {
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

  private async getDriverIdByUserId(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true, assignedCarId: true, taxiParkId: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    return driver;
  }

  async create(userId: string, dto: CreateWorkDayDto) {
    const driver = await this.getDriverIdByUserId(userId);
    if (!driver.assignedCarId) throw new BadRequestException("No assigned car");

    const car = await this.prisma.car.findUnique({
      where: { id: driver.assignedCarId },
      select: { id: true, state: true },
    });
    if (!car) throw new NotFoundException("Car not found");

    const carOnLine = dto.carOnLine ?? true;
    const shouldForceZeroRevenue =
      !carOnLine || car.state === CarState.EMERGENCY || car.state === CarState.REPAIR;
    const revenue = shouldForceZeroRevenue ? 0 : dto.revenue ?? 0;

    const workDay = await this.prisma.workDay.create({
      data: {
        driverId: driver.id,
        carId: car.id,
        workDate: new Date(dto.workDate),
        revenue,
        carOnLine,
      },
    });

    await this.actionLogs.createLog(
      userId,
      "CREATE_WORK_DAY",
      `Create work day ${workDay.id}`,
      driver.taxiParkId ?? undefined,
      { workDayId: workDay.id },
    );

    return workDay;
  }

  async listMy(userId: string) {
    const driver = await this.getDriverIdByUserId(userId);
    return this.prisma.workDay.findMany({
      where: { driverId: driver.id },
      orderBy: { workDate: "desc" },
    });
  }

  async getMy(userId: string, id: string) {
    const driver = await this.getDriverIdByUserId(userId);
    const workDay = await this.prisma.workDay.findUnique({ where: { id } });
    if (!workDay) throw new NotFoundException("WorkDay not found");
    if (workDay.driverId !== driver.id) throw new ForbiddenException();
    return workDay;
  }

  async updateMy(userId: string, id: string, dto: UpdateWorkDayDto) {
    const existing = await this.getMy(userId, id);

    // TODO: enforce "edit only current day"
    const driver = await this.getDriverIdByUserId(userId);
    const car = await this.prisma.car.findUnique({
      where: { id: existing.carId },
      select: { state: true },
    });
    if (!car) throw new NotFoundException("Car not found");

    const nextCarOnLine = dto.carOnLine ?? existing.carOnLine;
    const shouldForceZeroRevenue =
      !nextCarOnLine || car.state === CarState.EMERGENCY || car.state === CarState.REPAIR;

    const nextRevenue = shouldForceZeroRevenue
      ? 0
      : dto.revenue ?? Number(existing.revenue);

    const updated = await this.prisma.workDay.update({
      where: { id },
      data: {
        workDate: dto.workDate ? new Date(dto.workDate) : undefined,
        carOnLine: dto.carOnLine,
        revenue: nextRevenue,
      },
    });

    await this.actionLogs.createLog(
      userId,
      "UPDATE_WORK_DAY",
      `Update work day ${updated.id}`,
      driver.taxiParkId ?? undefined,
      { workDayId: updated.id },
    );

    return updated;
  }

  async listByDriver(userId: string, driverId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { taxiPark: { select: { directorId: true } } },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (!driver.taxiPark || driver.taxiPark.directorId !== directorId) {
      throw new ForbiddenException();
    }
    return this.prisma.workDay.findMany({
      where: { driverId },
      orderBy: { workDate: "desc" },
    });
  }

  async listByCar(userId: string, carId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      include: { taxiPark: { select: { directorId: true } } },
    });
    if (!car) throw new NotFoundException("Car not found");
    if (car.taxiPark.directorId !== directorId) throw new ForbiddenException();
    return this.prisma.workDay.findMany({
      where: { carId },
      orderBy: { workDate: "desc" },
    });
  }
}

