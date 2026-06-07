import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";

export class GetTaxiParksAnalyticsQueryDto {
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
