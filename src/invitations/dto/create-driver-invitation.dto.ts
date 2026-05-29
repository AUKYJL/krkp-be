import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateDriverInvitationDto {
  @ApiProperty({ example: "driver-uuid" })
  @IsString()
  driverId: string;
}

