import { Module } from "@nestjs/common";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";

@Module({
  imports: [PrismaModule, ActionLogsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}

