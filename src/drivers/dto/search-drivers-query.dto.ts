import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SearchDriversQueryDto {
  @ApiPropertyOptional({
    description: "Case-insensitive partial match by user's full name",
    example: "Иван",
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: "Filter drivers by belonging to any taxi park",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  })
  @IsBoolean()
  inTaxiPark?: boolean;
}
