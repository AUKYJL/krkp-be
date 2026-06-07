import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, Matches, ValidateNested } from "class-validator";
import { AnalyticsPeriodDto } from "./get-taxi-park-analytics-response.dto";

export class GetCarBrandsAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: "2025-04-01",
    description: "Дата начала периода в формате YYYY-MM-DD",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: "2025-04-30",
    description: "Дата окончания периода в формате YYYY-MM-DD",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class CarBrandsAnalyticsTaxiParkDto {
  @ApiProperty()
  taxiParkId: string;

  @ApiProperty()
  name: string;
}

export class CarBrandsAnalyticsBestRevenueBrandDto {
  @ApiProperty()
  firm: string;

  @ApiProperty({ example: 125000.5 })
  totalRevenue: number;
}

export class CarBrandsAnalyticsMostDowntimeBrandDto {
  @ApiProperty()
  firm: string;

  @ApiProperty({ example: 12 })
  downtimeDaysCount: number;
}

export class CarBrandsAnalyticsSummaryDto {
  @ApiProperty({ example: 4 })
  brandsCount: number;

  @ApiProperty({ example: 18 })
  carsCount: number;

  @ApiProperty({ example: 542300.75 })
  totalRevenue: number;

  @ApiProperty({ example: 27 })
  totalDowntimeDaysCount: number;

  @ApiProperty({
    type: CarBrandsAnalyticsBestRevenueBrandDto,
    nullable: true,
  })
  @ValidateNested()
  @Type(() => CarBrandsAnalyticsBestRevenueBrandDto)
  bestRevenueBrand: CarBrandsAnalyticsBestRevenueBrandDto | null;

  @ApiProperty({
    type: CarBrandsAnalyticsMostDowntimeBrandDto,
    nullable: true,
  })
  @ValidateNested()
  @Type(() => CarBrandsAnalyticsMostDowntimeBrandDto)
  mostDowntimeBrand: CarBrandsAnalyticsMostDowntimeBrandDto | null;
}

export class CarBrandAnalyticsItemDto {
  @ApiProperty()
  firm: string;

  @ApiProperty({ example: 5 })
  carsCount: number;

  @ApiProperty({ example: 153000.45 })
  totalRevenue: number;

  @ApiProperty({ example: 30600.09 })
  averageRevenuePerCar: number;

  @ApiProperty({ example: 4250.01 })
  averageRevenuePerOnlineDay: number;

  @ApiProperty({ example: 36 })
  onlineDaysCount: number;

  @ApiProperty({ example: 9 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 80 })
  utilizationRate: number;

  @ApiProperty({ example: 20 })
  downtimeRate: number;

  @ApiProperty({ example: 1 })
  revenueRank: number;

  @ApiProperty({ example: 2 })
  downtimeRank: number;
}

export class MostProfitableCarBrandAnalyticsItemDto {
  @ApiProperty()
  firm: string;

  @ApiProperty({ example: 5 })
  carsCount: number;

  @ApiProperty({ example: 153000.45 })
  totalRevenue: number;

  @ApiProperty({ example: 30600.09 })
  averageRevenuePerCar: number;

  @ApiProperty({ example: 4250.01 })
  averageRevenuePerOnlineDay: number;

  @ApiProperty({ example: 36 })
  onlineDaysCount: number;

  @ApiProperty({ example: 9 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 80 })
  utilizationRate: number;

  @ApiProperty({ example: 1 })
  revenueRank: number;
}

export class MostDowntimeCarBrandAnalyticsItemDto {
  @ApiProperty()
  firm: string;

  @ApiProperty({ example: 5 })
  carsCount: number;

  @ApiProperty({ example: 153000.45 })
  totalRevenue: number;

  @ApiProperty({ example: 36 })
  onlineDaysCount: number;

  @ApiProperty({ example: 9 })
  downtimeDaysCount: number;

  @ApiProperty({ example: 20 })
  downtimeRate: number;

  @ApiProperty({ example: 80 })
  utilizationRate: number;

  @ApiProperty({ example: 1 })
  downtimeRank: number;
}

export class GetCarBrandsAnalyticsResponseDto {
  @ApiProperty({ type: AnalyticsPeriodDto })
  @ValidateNested()
  @Type(() => AnalyticsPeriodDto)
  period: AnalyticsPeriodDto;

  @ApiProperty({ type: CarBrandsAnalyticsTaxiParkDto })
  @ValidateNested()
  @Type(() => CarBrandsAnalyticsTaxiParkDto)
  taxiPark: CarBrandsAnalyticsTaxiParkDto;

  @ApiProperty({ type: CarBrandsAnalyticsSummaryDto })
  @ValidateNested()
  @Type(() => CarBrandsAnalyticsSummaryDto)
  summary: CarBrandsAnalyticsSummaryDto;

  @ApiProperty({ type: [CarBrandAnalyticsItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CarBrandAnalyticsItemDto)
  brands: CarBrandAnalyticsItemDto[];

  @ApiProperty({ type: [MostProfitableCarBrandAnalyticsItemDto] })
  @ValidateNested({ each: true })
  @Type(() => MostProfitableCarBrandAnalyticsItemDto)
  mostProfitableBrands: MostProfitableCarBrandAnalyticsItemDto[];

  @ApiProperty({ type: [MostDowntimeCarBrandAnalyticsItemDto] })
  @ValidateNested({ each: true })
  @Type(() => MostDowntimeCarBrandAnalyticsItemDto)
  mostDowntimeBrands: MostDowntimeCarBrandAnalyticsItemDto[];
}
