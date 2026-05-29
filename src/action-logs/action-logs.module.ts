import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ActionLogsController } from "./action-logs.controller";
import { ActionLogsService } from "./action-logs.service";

@Module({
  imports: [PrismaModule],
  controllers: [ActionLogsController],
  providers: [ActionLogsService],
  exports: [ActionLogsService],
})
export class ActionLogsModule {}
