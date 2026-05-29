import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { CreateTaxiParkDto } from "./dto/create-taxi-park.dto";
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
      "CREATE_TAXI_PARK",
      `Create taxi park ${taxiPark.name}`,
      taxiPark.id,
    );
    return taxiPark;
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

  async update(userId: string, id: string, dto: UpdateTaxiParkDto) {
    await this.get(userId, id);
    const taxiPark = await this.prisma.taxiPark.update({
      where: { id },
      data: dto,
    });
    await this.actionLogs.createLog(
      userId,
      "UPDATE_TAXI_PARK",
      `Update taxi park ${taxiPark.name}`,
      taxiPark.id,
    );
    return taxiPark;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    const taxiPark = await this.prisma.taxiPark.delete({ where: { id } });
    await this.actionLogs.createLog(
      userId,
      "DELETE_TAXI_PARK",
      `Delete taxi park ${taxiPark.name}`,
      taxiPark.id,
    );
    return taxiPark;
  }
}

