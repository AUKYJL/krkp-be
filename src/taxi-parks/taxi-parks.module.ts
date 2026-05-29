import { Module } from "@nestjs/common";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TaxiParksController } from "./taxi-parks.controller";
import { TaxiParksService } from "./taxi-parks.service";

@Module({
  imports: [PrismaModule, ActionLogsModule],
  controllers: [TaxiParksController],
  providers: [TaxiParksService],
})
export class TaxiParksModule {}

