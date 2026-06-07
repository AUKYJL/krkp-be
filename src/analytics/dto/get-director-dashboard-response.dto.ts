import { ApiProperty } from "@nestjs/swagger";
import { AnalyticsPeriodDto } from "./get-taxi-park-analytics-response.dto";
import {
  ProblemCarAnalyticsItemDto,
  TaxiParkAnalyticsItemDto,
  TaxiParksDowntimeByDayPointDto,
  TaxiParksRevenueByDayPointDto,
  TaxiParksRevenueByTaxiParkPointDto,
  TopBrandAnalyticsItemDto,
  TopCarAnalyticsItemDto,
  TopDriverAnalyticsItemDto,
} from "../../taxi-parks/dto/get-taxi-parks-analytics-response.dto";

export class DirectorDashboardSummaryDto {
  @ApiProperty({ example: 3 })
  taxiParksCount: number;

  @ApiProperty({ example: 20 })
  driversCount: number;

  @ApiProperty({ example: 8 })
  activeDriversCount: number;

  @ApiProperty({ example: 15 })
  carsCount: number;

  @ApiProperty({ example: 120 })
  workDaysCount: number;

  @ApiProperty({ example: 95 })
  onlineDaysCount: number;

  @ApiProperty({ example: 25 })
  downtimeDaysCount: number;
}

export class DirectorDashboardFinancialKpisDto {
  @ApiProperty({ example: 100000.55 })
  totalRevenue: number;

  @ApiProperty({ example: 3333.35 })
  averageRevenuePerDay: number;

  @ApiProperty({ example: 12500.07 })
  averageRevenuePerActiveDriver: number;

  @ApiProperty({ example: 5000.03 })
  averageRevenuePerCar: number;

  @ApiProperty({ example: 33333.52 })
  averageRevenuePerTaxiPark: number;
}

export class DirectorDashboardDowntimeKpisDto {
  @ApiProperty({ example: 25 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 20.83 })
  downtimeRate: number;

  @ApiProperty({ example: 95 })
  onlineDaysCount: number;

  @ApiProperty({ example: 79.17 })
  onlineRate: number;

  @ApiProperty({ example: 26315.93 })
  estimatedDowntimeLoss: number;

  @ApiProperty({ type: [ProblemCarAnalyticsItemDto] })
  mostDowntimeCars: ProblemCarAnalyticsItemDto[];
}

export class DirectorDashboardDriversRatingItemDto extends TopDriverAnalyticsItemDto {}

export class DirectorDashboardDriverEfficiencyItemDto {
  @ApiProperty()
  driverId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  taxiParkName: string;

  @ApiProperty({ example: 73.25 })
  driverEfficiency: number;

  @ApiProperty({ example: 84.12 })
  revenueScore: number;

  @ApiProperty({ example: 26.67 })
  activityScore: number;

  @ApiProperty({ example: 50 })
  stabilityScore: number;

  @ApiProperty({ example: 25000.5 })
  totalRevenue: number;

  @ApiProperty({ example: 25000.5 })
  maxDriverRevenue: number;

  @ApiProperty({ example: 4 })
  daysWithRevenueAboveAverage: number;
}

export class DirectorDashboardDriverKpisDto {
  @ApiProperty({ type: [TopDriverAnalyticsItemDto] })
  topDrivers: TopDriverAnalyticsItemDto[];

  @ApiProperty({ type: [TopDriverAnalyticsItemDto] })
  belowAverageDrivers: TopDriverAnalyticsItemDto[];

  @ApiProperty({ type: [DirectorDashboardDriversRatingItemDto] })
  driversRating: DirectorDashboardDriversRatingItemDto[];

  @ApiProperty({ type: [DirectorDashboardDriverEfficiencyItemDto] })
  driverEfficiency: DirectorDashboardDriverEfficiencyItemDto[];
}

export class DirectorDashboardCarUtilizationItemDto extends TopCarAnalyticsItemDto {}

export class DirectorDashboardCarKpisDto {
  @ApiProperty({ type: [TopCarAnalyticsItemDto] })
  topCars: TopCarAnalyticsItemDto[];

  @ApiProperty({ type: [ProblemCarAnalyticsItemDto] })
  problemCars: ProblemCarAnalyticsItemDto[];

  @ApiProperty({ type: [DirectorDashboardCarUtilizationItemDto] })
  utilization: DirectorDashboardCarUtilizationItemDto[];

  @ApiProperty({ type: [TopBrandAnalyticsItemDto] })
  topBrands: TopBrandAnalyticsItemDto[];
}

export class DirectorDashboardChartsDto {
  @ApiProperty({ type: [TaxiParksRevenueByDayPointDto] })
  revenueByDay: TaxiParksRevenueByDayPointDto[];

  @ApiProperty({ type: [TaxiParksDowntimeByDayPointDto] })
  downtimeByDay: TaxiParksDowntimeByDayPointDto[];

  @ApiProperty({ type: [TaxiParksRevenueByTaxiParkPointDto] })
  revenueByTaxiPark: TaxiParksRevenueByTaxiParkPointDto[];
}

export class GetDirectorDashboardResponseDto {
  @ApiProperty({ type: AnalyticsPeriodDto })
  period: AnalyticsPeriodDto;

  @ApiProperty({ type: DirectorDashboardSummaryDto })
  summary: DirectorDashboardSummaryDto;

  @ApiProperty({ type: DirectorDashboardFinancialKpisDto })
  financialKpis: DirectorDashboardFinancialKpisDto;

  @ApiProperty({ type: DirectorDashboardDowntimeKpisDto })
  downtimeKpis: DirectorDashboardDowntimeKpisDto;

  @ApiProperty({ type: DirectorDashboardDriverKpisDto })
  driverKpis: DirectorDashboardDriverKpisDto;

  @ApiProperty({ type: DirectorDashboardCarKpisDto })
  carKpis: DirectorDashboardCarKpisDto;

  @ApiProperty({ type: DirectorDashboardChartsDto })
  charts: DirectorDashboardChartsDto;

  @ApiProperty({ type: [TaxiParkAnalyticsItemDto] })
  taxiParks: TaxiParkAnalyticsItemDto[];
}
