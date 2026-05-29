import { Module } from "@nestjs/common";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkDaysController } from "./work-days.controller";
import { WorkDaysService } from "./work-days.service";

@Module({
  imports: [PrismaModule, ActionLogsModule],
  controllers: [WorkDaysController],
  providers: [WorkDaysService],
})
export class WorkDaysModule {}

