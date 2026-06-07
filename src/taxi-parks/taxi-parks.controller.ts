import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { AnalyticsService } from "../analytics/analytics.service";
import { ROLE } from "../shared/types/roles";
import { RequestWithCurrentUser } from "../shared/types/requestWithUser";
import { GetTaxiParkAnalyticsQueryDto } from "../analytics/dto/get-taxi-park-analytics-query.dto";
import {
  GetCarAnalyticsResponseDto,
  GetTaxiParkAnalyticsResponseDto,
} from "../analytics/dto/get-taxi-park-analytics-response.dto";
import { CreateTaxiParkDto } from "./dto/create-taxi-park.dto";
import { GetTaxiParksAnalyticsQueryDto } from "./dto/get-taxi-parks-analytics-query.dto";
import { GetTaxiParksAnalyticsResponseDto } from "./dto/get-taxi-parks-analytics-response.dto";
import { UpdateTaxiParkDto } from "./dto/update-taxi-park.dto";
import { TaxiParksAnalyticsService } from "./taxi-parks-analytics.service";
import { TaxiParksService } from "./taxi-parks.service";

@ApiTags("taxi-parks")
@ApiBearerAuth("access-token")
@Roles(ROLE.DIRECTOR)
@Controller("taxi-parks")
export class TaxiParksController {
  constructor(
    private readonly service: TaxiParksService,
    private readonly analyticsService: TaxiParksAnalyticsService,
    private readonly legacyAnalyticsService: AnalyticsService,
  ) {}

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

  @Get("analytics")
  @ApiOkResponse({ type: GetTaxiParksAnalyticsResponseDto })
  @ApiOperation({ summary: "Общая аналитика по всем таксопаркам директора" })
  getAllTaxiParksAnalytics(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetTaxiParksAnalyticsQueryDto,
  ) {
    return this.analyticsService.getAllTaxiParksAnalytics(req.currentUser.id, query);
  }

  @Get(":taxiParkId/analytics")
  @ApiOkResponse({ type: GetTaxiParkAnalyticsResponseDto })
  @ApiOperation({ summary: "Аналитика по конкретному таксопарку за период" })
  getTaxiParkAnalytics(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
  ) {
    return this.analyticsService.getTaxiParkAnalytics(
      req.currentUser.id,
      taxiParkId,
      query,
    );
  }

  @Get(":taxiParkId/cars/:carId/analytics")
  @ApiOkResponse({ type: GetCarAnalyticsResponseDto })
  @ApiOperation({ summary: "Аналитика по конкретному автомобилю за период" })
  getCarAnalytics(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
    @Param("carId") carId: string,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
  ) {
    return this.legacyAnalyticsService.getCarAnalytics(
      req.currentUser.id,
      taxiParkId,
      carId,
      query,
    );
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
