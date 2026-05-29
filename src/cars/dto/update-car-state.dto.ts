import { ApiProperty } from "@nestjs/swagger";
import { CarState } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateCarStateDto {
  @ApiProperty({ enum: CarState, example: CarState.REPAIR })
  @IsEnum(CarState)
  state: CarState;
}

