import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { LOG_EVENTS } from "../shared/consts/log-events";
import { CreateTaxiParkDto } from "./dto/create-taxi-park.dto";
import { TaxiParkDriverItemDto } from "./dto/taxi-park-driver-item.dto";
import { UpdateTaxiParkDto } from "./dto/update-taxi-park.dto";

@Injectable()
export class TaxiParksService {
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

  async create(userId: string, dto: CreateTaxiParkDto) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const taxiPark = await this.prisma.taxiPark.create({
      data: { ...dto, directorId },
    });
    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.CREATE_TAXI_PARK,
      `Create taxi park ${taxiPark.name}`,
      taxiPark.id,
    );
    return taxiPark;
  }

  async getMe(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: { taxiPark: true },
    });
    if (!driver) throw new ForbiddenException("Only driver allowed");
    if (!driver.taxiPark) {
      throw new NotFoundException("Driver is not assigned to a taxi park");
    }
    return driver.taxiPark;
  }

  async listMine(userId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    return this.prisma.taxiPark.findMany({
      where: { directorId },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(userId: string, id: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const taxiPark = await this.prisma.taxiPark.findUnique({ where: { id } });
    if (!taxiPark) throw new NotFoundException("Taxi park not found");
    if (taxiPark.directorId !== directorId) throw new ForbiddenException();
    return taxiPark;
  }

  async listDrivers(userId: string, taxiParkId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const taxiPark = await this.prisma.taxiPark.findUnique({
      where: { id: taxiParkId },
    });
    if (!taxiPark) throw new NotFoundException("Taxi park not found");
    if (taxiPark.directorId !== directorId) throw new ForbiddenException();

    return this.prisma.driver
      .findMany({
        where: { taxiParkId },
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
      })
      .then((drivers) =>
        drivers.map(
          (driver): TaxiParkDriverItemDto => ({
            driverId: driver.id,
            userId: driver.user.id,
            fullName: driver.user.fullName,
            email: driver.user.email,
          }),
        ),
      );
  }

  async update(userId: string, id: string, dto: UpdateTaxiParkDto) {
    await this.get(userId, id);
    const taxiPark = await this.prisma.taxiPark.update({
      where: { id },
      data: dto,
    });
    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.UPDATE_TAXI_PARK,
      `Update taxi park ${taxiPark.name}`,
      taxiPark.id,
    );
    return taxiPark;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    const taxiPark = await this.prisma.taxiPark.delete({ where: { id } });

    return taxiPark;
  }
}
