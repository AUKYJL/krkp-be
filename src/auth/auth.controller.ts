import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import { BadResponseDto } from "src/shared/dto/badResponseDto";
import { UsersResponseDto as UserResponseDto } from "src/shared/dto/userResponseDto";
import { RequestWithCurrentUser } from "src/shared/types/requestWithUser";
import { AuthService } from "./auth.service";
import { PublicRoute } from "./decorators/public-route.decorator";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @PublicRoute()
  @Post("login")
  async login() {}

  @Get("me")
  @ApiOperation({ summary: "Получение авторизованного пользователя" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: BadResponseDto })
  async getCurrentUser() {}
}
