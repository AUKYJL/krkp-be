import { Module } from "@nestjs/common";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkDaysController } from "./work-days.controller";
import { WorkDaysSettlementCron } from "./work-days-settlement.cron";
import { WorkDaysSettlementService } from "./work-days-settlement.service";
import { WorkDaysService } from "./work-days.service";

@Module({
  imports: [PrismaModule, ActionLogsModule],
  controllers: [WorkDaysController],
  providers: [WorkDaysService, WorkDaysSettlementService, WorkDaysSettlementCron],
  exports: [WorkDaysSettlementService],
})
export class WorkDaysModule {}
