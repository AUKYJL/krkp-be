import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateTaxiParkDto {
  @ApiProperty({ example: "Таксопарк №1" })
  @IsString()
  name: string;

  @ApiProperty({ example: "Москва, ул. Пушкина 1" })
  @IsString()
  address: string;
}

