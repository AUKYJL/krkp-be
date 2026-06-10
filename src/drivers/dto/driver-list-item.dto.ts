import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CarState } from "@prisma/client";

export class DriverListAssignedCarDto {
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

  @ApiPropertyOptional({ nullable: true })
  taxiParkId?: string | null;
}

export class DriverListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true })
  taxiParkId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  taxiParkName?: string | null;

  @ApiProperty({ type: DriverListAssignedCarDto, nullable: true })
  assignedCar?: DriverListAssignedCarDto | null;
}
