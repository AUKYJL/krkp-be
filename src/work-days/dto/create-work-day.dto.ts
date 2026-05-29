import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNumber, IsOptional, Min } from "class-validator";

export class CreateWorkDayDto {
  @ApiProperty({ example: "2026-05-02" })
  @IsDateString()
  workDate: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  carOnLine?: boolean;
}

