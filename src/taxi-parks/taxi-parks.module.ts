import { Module } from "@nestjs/common";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TaxiParksController } from "./taxi-parks.controller";
import { TaxiParksAnalyticsService } from "./taxi-parks-analytics.service";
import { TaxiParksService } from "./taxi-parks.service";

@Module({
  imports: [PrismaModule, ActionLogsModule, AnalyticsModule],
  controllers: [TaxiParksController],
  providers: [TaxiParksService, TaxiParksAnalyticsService],
})
export class TaxiParksModule {}
