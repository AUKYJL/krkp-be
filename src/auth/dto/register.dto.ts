import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { ROLE } from "../../shared/types/roles";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Иван Иванов" })
  @IsString()
  fullName: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: ROLE, example: ROLE.DIRECTOR })
  @IsEnum(ROLE)
  role: ROLE;
}

