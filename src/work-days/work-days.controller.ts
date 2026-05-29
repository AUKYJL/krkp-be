import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequestWithCurrentUser } from "../shared/types/requestWithUser";
import { ROLE } from "../shared/types/roles";
import { CreateWorkDayDto } from "./dto/create-work-day.dto";
import { UpdateWorkDayDto } from "./dto/update-work-day.dto";
import { WorkDaysService } from "./work-days.service";

@ApiTags("work-days")
@ApiBearerAuth("access-token")
@Controller()
export class WorkDaysController {
  constructor(private service: WorkDaysService) {}

  @Post("work-days")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Создать дневную запись" })
  create(@Req() req: RequestWithCurrentUser, @Body() dto: CreateWorkDayDto) {
    return this.service.create(req.currentUser.id, dto);
  }

  @Get("work-days/my")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Мои дневные записи" })
  listMy(@Req() req: RequestWithCurrentUser) {
    return this.service.listMy(req.currentUser.id);
  }

  @Get("work-days/my/:id")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Моя дневная запись" })
  getMy(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.getMy(req.currentUser.id, id);
  }

  @Patch("work-days/:id")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Обновить мою дневную запись" })
  updateMy(
    @Req() req: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body() dto: UpdateWorkDayDto,
  ) {
    return this.service.updateMy(req.currentUser.id, id, dto);
  }

  @Get("drivers/:driverId/work-days")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Work-days водителя (директор)" })
  listByDriver(
    @Req() req: RequestWithCurrentUser,
    @Param("driverId") driverId: string,
  ) {
    return this.service.listByDriver(req.currentUser.id, driverId);
  }

  @Get("cars/:carId/work-days")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Work-days авто (директор)" })
  listByCar(@Req() req: RequestWithCurrentUser, @Param("carId") carId: string) {
    return this.service.listByCar(req.currentUser.id, carId);
  }
}

