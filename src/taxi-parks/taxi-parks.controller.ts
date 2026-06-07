import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { ROLE } from "../shared/types/roles";
import { RequestWithCurrentUser } from "../shared/types/requestWithUser";
import { CreateTaxiParkDto } from "./dto/create-taxi-park.dto";
import { UpdateTaxiParkDto } from "./dto/update-taxi-park.dto";
import { TaxiParksService } from "./taxi-parks.service";

@ApiTags("taxi-parks")
@ApiBearerAuth("access-token")
@Roles(ROLE.DIRECTOR)
@Controller("taxi-parks")
export class TaxiParksController {
  constructor(private service: TaxiParksService) {}

  @Post()
  @ApiOperation({ summary: "Создать таксопарк" })
  create(@Req() req: RequestWithCurrentUser, @Body() dto: CreateTaxiParkDto) {
    return this.service.create(req.currentUser.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Список моих таксопарков" })
  listMine(@Req() req: RequestWithCurrentUser) {
    return this.service.listMine(req.currentUser.id);
  }

  @Get("me")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Текущий таксопарк водителя" })
  getMe(@Req() req: RequestWithCurrentUser) {
    return this.service.getMe(req.currentUser.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить таксопарк" })
  get(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.get(req.currentUser.id, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Обновить таксопарк" })
  update(
    @Req() req: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body() dto: UpdateTaxiParkDto,
  ) {
    return this.service.update(req.currentUser.id, id, dto);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "Deleted" })
  @ApiOperation({ summary: "Удалить таксопарк" })
  remove(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.remove(req.currentUser.id, id);
  }
}
