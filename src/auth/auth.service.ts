import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "../user/user.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  private hashPassword(password: string) {
    const salt = randomBytes(16);
    const derivedKey = scryptSync(password, salt, 64);
    return `${salt.toString("hex")}.${derivedKey.toString("hex")}`;
  }

  private verifyPassword(password: string, passwordHash: string) {
    const [saltHex, hashHex] = passwordHash.split(".");
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length);
    return timingSafeEqual(expected, actual);
  }

  async register(dto: RegisterDto) {
    const existed = await this.userService.getUserByEmail(dto.email);
    if (existed) throw new BadRequestException("Email already used");
    if (dto.password !== dto.repeatedPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    const passwordHash = this.hashPassword(dto.password);
    const user = await this.userService.createUser({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      role: dto.role,
    });

    const accessToken = await this.jwtService.signAsync({
      id: user.id,
      role: user.role,
    });

    return { accessToken };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.getUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = this.verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const accessToken = await this.jwtService.signAsync({
      id: user.id,
      role: user.role,
    });
    return { accessToken };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
