import { Module } from "@nestjs/common";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CarsController } from "./cars.controller";
import { CarsService } from "./cars.service";

@Module({
  imports: [PrismaModule, ActionLogsModule],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}

