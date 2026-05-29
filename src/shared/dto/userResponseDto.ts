import { ApiProperty } from "@nestjs/swagger";
import { ROLE } from "../types/roles";

export class UsersResponseDto {
  @ApiProperty({ example: "b3d8e3d6-8a5a-4d6f-a2cb-3af69b83e46a" })
  id: string;

  @ApiProperty({ example: "user@example.com" })
  email: string;

  @ApiProperty({ example: "Иван Иванов" })
  fullName: string;

  @ApiProperty({ enum: ROLE, example: ROLE.DIRECTOR })
  role: ROLE;
}

