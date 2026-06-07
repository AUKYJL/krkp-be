import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { ROLE } from "../shared/types/roles";
import { RequestWithCurrentUser } from "../shared/types/requestWithUser";
import { GetTaxiParkAnalyticsQueryDto } from "./dto/get-taxi-park-analytics-query.dto";
import { AnalyticsService } from "./analytics.service";
import { GetTaxiParksAnalyticsQueryDto } from "../taxi-parks/dto/get-taxi-parks-analytics-query.dto";
import { GetDirectorDashboardQueryDto } from "./dto/get-director-dashboard-query.dto";
import { GetDirectorDashboardResponseDto } from "./dto/get-director-dashboard-response.dto";
import { GetDriverDashboardQueryDto } from "./dto/get-driver-dashboard-query.dto";
import { GetDriverDashboardResponseDto } from "./dto/get-driver-dashboard-response.dto";

@ApiTags("analytics")
@ApiBearerAuth("access-token")
@Controller()
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get("analytics/director/dashboard")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Аналитический дашборд директора" })
  @ApiOkResponse({ type: GetDirectorDashboardResponseDto })
  getDirectorDashboard(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetDirectorDashboardQueryDto,
  ) {
    return this.service.getDirectorDashboard(req.currentUser.id, query);
  }

  @Get("analytics/driver/dashboard")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Аналитический дашборд водителя" })
  @ApiOkResponse({ type: GetDriverDashboardResponseDto })
  getDriverDashboard(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetDriverDashboardQueryDto,
  ) {
    return this.service.getDriverDashboard(req.currentUser.id, query);
  }

  @Get("analytics/taxi-parks/:taxiParkId/drivers/:driverId/revenue")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Выручка водителя " })
  driverRevenue(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
    @Param("driverId") driverId: string,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
  ) {
    return this.service.driverRevenue(req.currentUser.id, taxiParkId, driverId, query);
  }

  @Get("analytics/taxi-parks/:taxiParkId/revenue")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Выручка таксопарка " })
  taxiParkRevenue(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
  ) {
    return this.service.taxiParkRevenue(req.currentUser.id, taxiParkId, query);
  }

  @Get("analytics/revenue/all")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Выручка всех " })
  allRevenue(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetTaxiParksAnalyticsQueryDto,
  ) {
    return this.service.allRevenue(req.currentUser.id, query);
  }

  @Get("analytics/cars/most-profitable-brands")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Самые прибыльные бренды " })
  mostProfitableBrands(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
    @Query("taxiParkId") taxiParkId?: string,
  ) {
    return this.service.mostProfitableBrands(req.currentUser.id, query, taxiParkId);
  }

  @Get("analytics/cars/not-on-line")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Авто не на линии " })
  carsNotOnLine(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
    @Query("taxiParkId") taxiParkId?: string,
  ) {
    return this.service.carsNotOnLine(req.currentUser.id, query, taxiParkId);
  }

  @Get("analytics/cars/most-broken-brands")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Самые ломающиеся бренды " })
  mostBrokenBrands(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
    @Query("taxiParkId") taxiParkId?: string,
  ) {
    return this.service.mostBrokenBrands(req.currentUser.id, query, taxiParkId);
  }

  @Get("analytics/drivers/rating")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Рейтинг водителей " })
  driversRating(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
    @Query("taxiParkId") taxiParkId?: string,
  ) {
    return this.service.driversRating(req.currentUser.id, query, taxiParkId);
  }

  @Get("analytics/downtime-losses")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Потери от простоя " })
  downtimeLosses(
    @Req() req: RequestWithCurrentUser,
    @Query() query: GetTaxiParkAnalyticsQueryDto,
    @Query("taxiParkId") taxiParkId?: string,
  ) {
    return this.service.downtimeLosses(req.currentUser.id, query, taxiParkId);
  }
}
