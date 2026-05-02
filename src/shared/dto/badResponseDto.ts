import { ApiProperty } from "@nestjs/swagger";

export class BadResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty()
  message: string;
}
