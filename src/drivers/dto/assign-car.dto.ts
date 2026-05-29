import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AssignCarDto {
  @ApiProperty({ example: "car-uuid" })
  @IsString()
  carId: string;
}

