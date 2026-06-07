import { ApiProperty } from "@nestjs/swagger";
import { InvitationStatus } from "@prisma/client";

class MyInvitationTaxiParkDto {
  @ApiProperty({ example: "3dd4b7b5-4cd5-4636-ae62-df754edfe7e4" })
  id: string;

  @ApiProperty({ example: "Таксопарк №1" })
  name: string;

  @ApiProperty({ example: "Москва, ул. Пушкина 1" })
  address: string;
}

export class MyInvitationItemDto {
  @ApiProperty({ example: "8fcd6331-33a8-4f90-b6a0-e87ea8dc9a39" })
  invitationId: string;

  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.PENDING })
  status: InvitationStatus;

  @ApiProperty({ example: "2026-06-07T10:15:00.000Z" })
  createdAt: Date;

  @ApiProperty({ type: MyInvitationTaxiParkDto })
  taxiPark: MyInvitationTaxiParkDto;
}
