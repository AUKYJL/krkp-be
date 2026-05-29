import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CarState } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateCarDto {
  @ApiProperty({ example: "Toyota" })
  @IsString()
  firm: string;

  @ApiProperty({ example: "Camry" })
  @IsString()
  model: string;

  @ApiProperty({ example: "SEDAN" })
  @IsString()
  type: string;

  @ApiProperty({ example: "A123BC77" })
  @IsString()
  plateNumber: string;

  @ApiPropertyOptional({ enum: CarState, example: CarState.WORKING })
  @IsOptional()
  @IsEnum(CarState)
  state?: CarState;
}

