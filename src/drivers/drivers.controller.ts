import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequestWithCurrentUser } from "../shared/types/requestWithUser";
import { ROLE } from "../shared/types/roles";
import { AssignCarDto } from "./dto/assign-car.dto";
import { DriverSearchItemDto } from "./dto/driver-search-item.dto";
import { SearchDriversQueryDto } from "./dto/search-drivers-query.dto";
import { UpdateDriverDto } from "./dto/update-driver.dto";
import { DriversService } from "./drivers.service";

@ApiTags("drivers")
@ApiBearerAuth("access-token")
@Controller("drivers")
export class DriversController {
  constructor(private service: DriversService) {}

  @Get()
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Список водителей" })
  list(@Req() req: RequestWithCurrentUser) {
    return this.service.list(req.currentUser.id);
  }

  @Get("search")
  @Roles(ROLE.DIRECTOR)
  @ApiOkResponse({ type: DriverSearchItemDto, isArray: true })
  @ApiOperation({ summary: "Глобальный поиск водителей для директора" })
  search(@Req() req: RequestWithCurrentUser, @Query() query: SearchDriversQueryDto) {
    return this.service.search(req.currentUser.id, query);
  }

  @Get("me")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Профиль водителя (me)" })
  getMe(@Req() req: RequestWithCurrentUser) {
    return this.service.getMe(req.currentUser.id);
  }

  @Get(":id")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Получить водителя" })
  get(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.get(req.currentUser.id, id);
  }

  @Patch(":id")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Обновить водителя" })
  update(
    @Req() req: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.service.update(req.currentUser.id, id, dto);
  }

  @Delete(":id")
  @Roles(ROLE.DIRECTOR)
  @ApiOkResponse({ description: "Deleted" })
  @ApiOperation({ summary: "Удалить водителя" })
  remove(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.remove(req.currentUser.id, id);
  }

  @Post(":driverId/assign-car")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Назначить авто водителю" })
  assignCar(
    @Req() req: RequestWithCurrentUser,
    @Param("driverId") driverId: string,
    @Body() dto: AssignCarDto,
  ) {
    return this.service.assignCar(req.currentUser.id, driverId, dto);
  }
}
