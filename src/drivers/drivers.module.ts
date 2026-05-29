import { Module } from "@nestjs/common";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";

@Module({
  imports: [PrismaModule, ActionLogsModule],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}

