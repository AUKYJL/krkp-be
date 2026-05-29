import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActionLogsService {
  constructor(private prisma: PrismaService) {}

  createLog(
    userId: string,
    action: string,
    description?: string,
    taxiParkId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.actionLog.create({
      data: {
        userId,
        action,
        description,
        taxiParkId,
        ...(metadata ? ({ metadata } as any) : {}),
      } as any,
    });
  }
}
