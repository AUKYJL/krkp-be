import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CarState } from "@prisma/client";

export class CarListAssignedDriverUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;
}

export class CarListAssignedDriverDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;
}

export class CarListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firm: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  plateNumber: string;

  @ApiProperty({ enum: CarState })
  state: CarState;

  @ApiProperty()
  taxiParkId: string;

  @ApiPropertyOptional({ nullable: true, type: CarListAssignedDriverDto })
  assignedDriver?: CarListAssignedDriverDto | null;
}
