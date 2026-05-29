import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class ActionLogQueryDto {
  @ApiPropertyOptional({ description: "Action filter", example: "CREATE_CAR" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: "2026-01-01T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-01-31T23:59:59.000Z" })
  @IsOptional()
  @IsDateString()
  to?: string;
}

