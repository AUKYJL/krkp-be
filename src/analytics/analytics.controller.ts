import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { ROLE } from "../shared/types/roles";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsDateQueryDto } from "./dto/analytics-date-query.dto";
import { AnalyticsPeriodQueryDto } from "./dto/analytics-period-query.dto";

@ApiTags("analytics")
@ApiBearerAuth("access-token")
@Roles(ROLE.DIRECTOR)
@Controller("analytics")
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get("driver/:driverId/revenue")
  @ApiOperation({ summary: "Выручка водителя " })
  driverRevenue(
    @Param("driverId") driverId: string,
    @Query() query: AnalyticsPeriodQueryDto,
  ) {
    return this.service.driverRevenue();
  }

  @Get("taxi-parks/:taxiParkId/revenue")
  @ApiOperation({ summary: "Выручка таксопарка " })
  taxiParkRevenue(
    @Param("taxiParkId") taxiParkId: string,
    @Query() query: AnalyticsPeriodQueryDto,
  ) {
    return this.service.taxiParkRevenue();
  }

  @Get("revenue/all")
  @ApiOperation({ summary: "Выручка всех " })
  allRevenue(@Query() query: AnalyticsDateQueryDto) {
    return this.service.allRevenue();
  }

  @Get("cars/most-profitable-brands")
  @ApiOperation({ summary: "Самые прибыльные бренды " })
  mostProfitableBrands(@Query() query: AnalyticsPeriodQueryDto) {
    return this.service.mostProfitableBrands();
  }

  @Get("cars/not-on-line")
  @ApiOperation({ summary: "Авто не на линии " })
  carsNotOnLine(@Query() query: AnalyticsPeriodQueryDto) {
    return this.service.carsNotOnLine();
  }

  @Get("cars/most-broken-brands")
  @ApiOperation({ summary: "Самые ломающиеся бренды " })
  mostBrokenBrands(@Query() query: AnalyticsPeriodQueryDto) {
    return this.service.mostBrokenBrands();
  }

  @Get("drivers/rating")
  @ApiOperation({ summary: "Рейтинг водителей " })
  driversRating(@Query() query: AnalyticsPeriodQueryDto) {
    return this.service.driversRating();
  }

  @Get("downtime-losses")
  @ApiOperation({ summary: "Потери от простоя " })
  downtimeLosses(@Query() query: AnalyticsPeriodQueryDto) {
    return this.service.downtimeLosses();
  }
}
