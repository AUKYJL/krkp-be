import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { PrismaService } from "../prisma/prisma.service";
import { LOG_EVENTS } from "../shared/consts/log-events";
import { AssignCarDto } from "./dto/assign-car.dto";
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
    return this.prisma.driver.findMany({
      where: { taxiPark: { directorId } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
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
    });
    if (!driver) throw new NotFoundException("Driver not found");
    return driver;
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

    const car = await this.prisma.car.findUnique({
      where: { id: dto.carId },
      select: { id: true, taxiParkId: true, assignedDriver: { select: { id: true } } },
    });
    if (!car) throw new NotFoundException("Car not found");
    if (car.taxiParkId !== driver.taxiParkId) {
      throw new BadRequestException("Car must belong to same taxi park");
    }
    if (car.assignedDriver) throw new BadRequestException("Car already assigned");
    if (driver.assignedCarId) throw new BadRequestException("Driver already has car");

    const updated = await this.prisma.driver.update({
      where: { id: driverId },
      data: { assignedCarId: dto.carId },
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
