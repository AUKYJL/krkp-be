import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CarState } from "@prisma/client";
import { ROLE } from "../../shared/types/roles";

export class DriverMeUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: ROLE })
  role: ROLE;
}

export class DriverMeTaxiParkDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;
}

export class DriverMeAssignedCarDto {
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

export class DriverMeWorkDayDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workDate: Date;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  finishedAt?: Date | null;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  carOnLine: boolean;

  @ApiProperty()
  carId: string;

  @ApiProperty()
  updatedAt: Date;
}

export class DriverMeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional({ nullable: true })
  taxiParkId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: DriverMeUserDto })
  user?: DriverMeUserDto | null;

  @ApiPropertyOptional({ nullable: true, type: DriverMeTaxiParkDto })
  taxiPark?: DriverMeTaxiParkDto | null;

  @ApiPropertyOptional({ nullable: true, type: DriverMeAssignedCarDto })
  assignedCar?: DriverMeAssignedCarDto | null;

  @ApiProperty({ example: false })
  isOnLine: boolean;

  @ApiPropertyOptional({ nullable: true, type: DriverMeWorkDayDto })
  activeWorkDay?: DriverMeWorkDayDto | null;
}
