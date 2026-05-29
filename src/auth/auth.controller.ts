import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { BadResponseDto } from "src/shared/dto/badResponseDto";
import { UsersResponseDto as UserResponseDto } from "src/shared/dto/userResponseDto";
import { AuthTokenResponseDto } from "src/shared/dto/authTokenResponseDto";
import { RequestWithCurrentUser } from "src/shared/types/requestWithUser";
import { AuthService } from "./auth.service";
import { PublicRoute } from "./decorators/public-route.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @PublicRoute()
  @ApiOperation({ summary: "Регистрация пользователя" })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  @ApiBadRequestResponse({ type: BadResponseDto })
  @ApiBody({ type: RegisterDto })
  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @PublicRoute()
  @ApiOperation({ summary: "Логин пользователя" })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  @ApiBadRequestResponse({ type: BadResponseDto })
  @ApiBody({ type: LoginDto })
  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Получение авторизованного пользователя" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: BadResponseDto })
  async getCurrentUser(@Req() req: RequestWithCurrentUser) {
    return this.authService.me(req.currentUser.id);
  }
}
