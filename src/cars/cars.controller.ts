import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequestWithCurrentUser } from "../shared/types/requestWithUser";
import { ROLE } from "../shared/types/roles";
import { CarsService } from "./cars.service";
import { CreateCarDto } from "./dto/create-car.dto";
import { UpdateCarDto } from "./dto/update-car.dto";
import { UpdateCarStateDto } from "./dto/update-car-state.dto";

@ApiTags("cars")
@ApiBearerAuth("access-token")
@Controller()
export class CarsController {
  constructor(private service: CarsService) {}

  @Post("taxi-parks/:taxiParkId/cars")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Создать авто в таксопарке" })
  create(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
    @Body() dto: CreateCarDto,
  ) {
    return this.service.create(req.currentUser.id, taxiParkId, dto);
  }

  @Get("taxi-parks/:taxiParkId/cars")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Список авто таксопарка" })
  listByTaxiPark(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
  ) {
    return this.service.listByTaxiPark(req.currentUser.id, taxiParkId);
  }

  @Get("taxi-parks/:taxiParkId/cars/available")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Свободные авто таксопарка" })
  listAvailableByTaxiPark(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
  ) {
    return this.service.listAvailableByTaxiPark(req.currentUser.id, taxiParkId);
  }

  @Get("cars/:id")
  @Roles(ROLE.DIRECTOR, ROLE.DRIVER)
  @ApiOperation({ summary: "Получить авто по id" })
  get(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return req.role === ROLE.DRIVER
      ? this.service.getAsDriver(req.currentUser.id, id)
      : this.service.getAsDirector(req.currentUser.id, id);
  }

  @Patch("cars/:id")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Обновить авто" })
  update(
    @Req() req: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body() dto: UpdateCarDto,
  ) {
    return this.service.update(req.currentUser.id, id, dto);
  }

  @Patch("cars/:id/state")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Обновить состояние авто" })
  updateState(
    @Req() req: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body() dto: UpdateCarStateDto,
  ) {
    return this.service.updateState(req.currentUser.id, id, dto.state);
  }

  @Delete("cars/:id")
  @Roles(ROLE.DIRECTOR)
  @ApiOkResponse({ description: "Deleted" })
  @ApiOperation({ summary: "Удалить авто" })
  remove(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.remove(req.currentUser.id, id);
  }
}
