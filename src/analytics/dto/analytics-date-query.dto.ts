import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class AnalyticsDateQueryDto {
  @ApiProperty({ example: "2026-05-02" })
  @IsDateString()
  date: string;
}

