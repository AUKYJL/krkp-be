import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { ROLE } from "../shared/types/roles";
import { PrismaService } from "../prisma/prisma.service";
import { ActionLogQueryDto } from "./dto/action-log-query.dto";

@ApiTags("action-logs")
@ApiBearerAuth("access-token")
@Roles(ROLE.DIRECTOR)
@Controller()
export class ActionLogsController {
  constructor(private prisma: PrismaService) {}

  @Get("action-logs")
  @ApiOperation({ summary: "Получить action logs" })
  @ApiOkResponse({ description: "List of logs" })
  list(@Query() query: ActionLogQueryDto) {
    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    return this.prisma.actionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  @Get("taxi-parks/:taxiParkId/action-logs")
  @ApiOperation({ summary: "Получить action logs по таксопарку" })
  listByTaxiPark(
    @Param("taxiParkId") taxiParkId: string,
    @Query() query: ActionLogQueryDto,
  ) {
    const where: any = { taxiParkId };
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    return this.prisma.actionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }
}

