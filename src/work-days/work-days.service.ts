import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CarState, WorkDayStatus } from "@prisma/client";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { PrismaService } from "../prisma/prisma.service";
import { LOG_EVENTS } from "../shared/consts/log-events";
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
      select: { id: true, state: true, taxiParkId: true },
    });
    if (!car) throw new NotFoundException("Car not found");

    if (driver.taxiParkId && car.taxiParkId !== driver.taxiParkId) {
      throw new BadRequestException("Car must belong to driver's taxi park");
    }

    const activeWorkDay = await this.prisma.workDay.findFirst({
      where: { driverId: driver.id, status: WorkDayStatus.ACTIVE },
      select: { id: true },
    });
    if (activeWorkDay) {
      throw new BadRequestException("Driver already has an active shift");
    }

    const carOnLine = car.state === CarState.WORKING;
    const revenue = carOnLine ? dto.revenue ?? 0 : 0;

    const workDay = await this.prisma.workDay.create({
      data: {
        driverId: driver.id,
        carId: car.id,
        workDate: new Date(),
        startedAt: new Date(),
        revenue,
        carOnLine,
        status: WorkDayStatus.ACTIVE,
      },
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.CREATE_WORK_DAY,
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
      orderBy: { startedAt: "desc" },
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
    const driver = await this.getDriverIdByUserId(userId);
    if (existing.status !== WorkDayStatus.ACTIVE) {
      throw new BadRequestException("Shift is already finished");
    }
    const car = await this.prisma.car.findUnique({
      where: { id: existing.carId },
      select: { state: true },
    });
    if (!car) throw new NotFoundException("Car not found");

    const nextRevenue =
      car.state === CarState.WORKING ? dto.revenue ?? Number(existing.revenue) : 0;

    const updated = await this.prisma.workDay.update({
      where: { id },
      data: {
        revenue: nextRevenue,
      },
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.UPDATE_WORK_DAY,
      `Update work day ${updated.id}`,
      driver.taxiParkId ?? undefined,
      { workDayId: updated.id },
    );

    return updated;
  }

  async finishMy(userId: string, id: string) {
    const existing = await this.getMy(userId, id);
    if (existing.status !== WorkDayStatus.ACTIVE) {
      throw new BadRequestException("Shift is already finished");
    }

    const driver = await this.getDriverIdByUserId(userId);
    const finishedAt = new Date();
    const revenue = Number(existing.revenue);
    const updated = await this.prisma.workDay.update({
      where: { id },
      data: {
        finishedAt,
        status: revenue > 0 ? WorkDayStatus.COMPLETED : WorkDayStatus.DOWNTIME,
      },
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.FINISH_WORK_DAY,
      `Finish work day ${updated.id}`,
      driver.taxiParkId ?? undefined,
      { workDayId: updated.id, finishedAt },
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
