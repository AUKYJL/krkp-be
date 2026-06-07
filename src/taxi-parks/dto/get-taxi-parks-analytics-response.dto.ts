import { ApiProperty } from "@nestjs/swagger";
import { CarState } from "@prisma/client";

export class TaxiParksAnalyticsPeriodDto {
  @ApiProperty({ example: "2025-04-01" })
  from: string;

  @ApiProperty({ example: "2025-04-30" })
  to: string;

  @ApiProperty({ example: 30 })
  daysCount: number;
}

export class TaxiParksAnalyticsSummaryDto {
  @ApiProperty({ example: 3 })
  taxiParksCount: number;

  @ApiProperty({ example: 20 })
  driversCount: number;

  @ApiProperty({ example: 8 })
  activeDriversCount: number;

  @ApiProperty({ example: 15 })
  carsCount: number;

  @ApiProperty({ example: 100000.55 })
  totalRevenue: number;

  @ApiProperty({ example: 3333.35 })
  averageRevenuePerDay: number;

  @ApiProperty({ example: 33333.52 })
  averageRevenuePerTaxiPark: number;

  @ApiProperty({ example: 12500.07 })
  averageRevenuePerActiveDriver: number;

  @ApiProperty({ example: 5000.03 })
  averageRevenuePerCar: number;

  @ApiProperty({ example: 120 })
  workDaysCount: number;

  @ApiProperty({ example: 95 })
  onlineDaysCount: number;

  @ApiProperty({ example: 25 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 79.17 })
  onlineRate: number;

  @ApiProperty({ example: 20.83 })
  downtimeRate: number;

  @ApiProperty({ example: 26315.93 })
  estimatedDowntimeLoss: number;
}

export class TaxiParksRevenueByDayPointDto {
  @ApiProperty({ example: "2025-04-01" })
  date: string;

  @ApiProperty({ example: 4800.25 })
  revenue: number;

  @ApiProperty({ example: 7 })
  onlineCarsCount: number;

  @ApiProperty({ example: 2 })
  downtimeCarsCount: number;
}

export class TaxiParksRevenueByTaxiParkPointDto {
  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  taxiParkName: string;

  @ApiProperty({ example: 25000.5 })
  revenue: number;
}

export class TaxiParksDowntimeByDayPointDto {
  @ApiProperty({ example: "2025-04-01" })
  date: string;

  @ApiProperty({ example: 2 })
  downtimeCarsCount: number;
}

export class TaxiParksAnalyticsChartsDto {
  @ApiProperty({ type: [TaxiParksRevenueByDayPointDto] })
  revenueByDay: TaxiParksRevenueByDayPointDto[];

  @ApiProperty({ type: [TaxiParksRevenueByTaxiParkPointDto] })
  revenueByTaxiPark: TaxiParksRevenueByTaxiParkPointDto[];

  @ApiProperty({ type: [TaxiParksDowntimeByDayPointDto] })
  downtimeByDay: TaxiParksDowntimeByDayPointDto[];
}

export class TaxiParkAnalyticsItemDto {
  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ example: 20 })
  driversCount: number;

  @ApiProperty({ example: 8 })
  activeDriversCount: number;

  @ApiProperty({ example: 15 })
  carsCount: number;

  @ApiProperty({ example: 100000.55 })
  totalRevenue: number;

  @ApiProperty({ example: 3333.35 })
  averageRevenuePerDay: number;

  @ApiProperty({ example: 12500.07 })
  averageRevenuePerActiveDriver: number;

  @ApiProperty({ example: 5000.03 })
  averageRevenuePerCar: number;

  @ApiProperty({ example: 120 })
  workDaysCount: number;

  @ApiProperty({ example: 95 })
  onlineDaysCount: number;

  @ApiProperty({ example: 25 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 79.17 })
  onlineRate: number;

  @ApiProperty({ example: 20.83 })
  downtimeRate: number;

  @ApiProperty({ example: 26315.93 })
  estimatedDowntimeLoss: number;
}

export class TopDriverAnalyticsItemDto {
  @ApiProperty()
  driverId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  taxiParkName: string;

  @ApiProperty({ example: 25000.5 })
  totalRevenue: number;

  @ApiProperty({ example: 3125.06 })
  averageRevenuePerOnlineDay: number;

  @ApiProperty({ example: 8 })
  onlineDaysCount: number;

  @ApiProperty({ example: 2 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 26.67 })
  activityRate: number;

  @ApiProperty({ example: 1 })
  rank: number;
}

export class TopCarAnalyticsItemDto {
  @ApiProperty()
  carId: string;

  @ApiProperty()
  firm: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  plateNumber: string;

  @ApiProperty({ enum: CarState })
  state: CarState;

  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  taxiParkName: string;

  @ApiProperty({ example: 21000.2 })
  totalRevenue: number;

  @ApiProperty({ example: 2625.03 })
  averageRevenuePerOnlineDay: number;

  @ApiProperty({ example: 8 })
  onlineDaysCount: number;

  @ApiProperty({ example: 1 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 26.67 })
  utilizationRate: number;
}

export class TopBrandAnalyticsItemDto {
  @ApiProperty()
  firm: string;

  @ApiProperty({ example: 5 })
  carsCount: number;

  @ApiProperty({ example: 65000.4 })
  totalRevenue: number;

  @ApiProperty({ example: 13000.08 })
  averageRevenuePerCar: number;

  @ApiProperty({ example: 42 })
  onlineDaysCount: number;

  @ApiProperty({ example: 8 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 28 })
  utilizationRate: number;
}

export class ProblemTaxiParkAnalyticsItemDto {
  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ example: 12 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 35.29 })
  downtimeRate: number;

  @ApiProperty({ example: 18250.5 })
  estimatedDowntimeLoss: number;
}

export class ProblemCarAnalyticsItemDto {
  @ApiProperty()
  carId: string;

  @ApiProperty()
  firm: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  plateNumber: string;

  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  taxiParkName: string;

  @ApiProperty({ example: 4 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 11000.5 })
  estimatedLoss: number;
}

export class GetTaxiParksAnalyticsResponseDto {
  @ApiProperty({ type: TaxiParksAnalyticsPeriodDto })
  period: TaxiParksAnalyticsPeriodDto;

  @ApiProperty({ type: TaxiParksAnalyticsSummaryDto })
  summary: TaxiParksAnalyticsSummaryDto;

  @ApiProperty({ type: TaxiParksAnalyticsChartsDto })
  charts: TaxiParksAnalyticsChartsDto;

  @ApiProperty({ type: [TaxiParkAnalyticsItemDto] })
  taxiParks: TaxiParkAnalyticsItemDto[];

  @ApiProperty({ type: [TopDriverAnalyticsItemDto] })
  topDrivers: TopDriverAnalyticsItemDto[];

  @ApiProperty({ type: [TopCarAnalyticsItemDto] })
  topCars: TopCarAnalyticsItemDto[];

  @ApiProperty({ type: [TopBrandAnalyticsItemDto] })
  topBrands: TopBrandAnalyticsItemDto[];

  @ApiProperty({ type: [ProblemTaxiParkAnalyticsItemDto] })
  problemTaxiParks: ProblemTaxiParkAnalyticsItemDto[];

  @ApiProperty({ type: [ProblemCarAnalyticsItemDto] })
  problemCars: ProblemCarAnalyticsItemDto[];
}
