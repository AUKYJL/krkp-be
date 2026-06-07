import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DriverSearchItemDto {
  @ApiProperty({ example: "4af49d61-b9e2-48d9-a868-163d5379d73f" })
  driverId: string;

  @ApiProperty({ example: "6ab6c1a0-af7c-4af8-bf19-c8c3cd1dbdc5" })
  userId: string;

  @ApiProperty({ example: "Иван Иванов" })
  fullName: string;

  @ApiProperty({ example: "driver@example.com" })
  email: string;

  @ApiProperty({ example: false })
  isInTaxiPark: boolean;

  @ApiPropertyOptional({ example: "3dd4b7b5-4cd5-4636-ae62-df754edfe7e4" })
  assignedTaxiParkId?: string;
}
