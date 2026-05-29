import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ROLE } from "../shared/types/roles";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  getUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  getUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(input: {
    email: string;
    fullName: string;
    passwordHash: string;
    role: ROLE;
  }) {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        role: input.role,
      },
    });

    if (input.role === ROLE.DIRECTOR) {
      await this.prisma.director.create({ data: { userId: user.id } });
    }
    if (input.role === ROLE.DRIVER) {
      await this.prisma.driver.create({
        data: {
          userId: user.id,
          // NOTE: текущий Prisma client в репо может требовать поля как обязательные
          passportNumber: "",
          experience: 0,
        } as any,
      });
    }
    return user;
  }
}
