import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequestWithCurrentUser } from "../shared/types/requestWithUser";
import { ROLE } from "../shared/types/roles";
import { CreateDriverInvitationDto } from "./dto/create-driver-invitation.dto";
import { InvitationsService } from "./invitations.service";

@ApiTags("invitations")
@ApiBearerAuth("access-token")
@Controller()
export class InvitationsController {
  constructor(private service: InvitationsService) {}

  @Post("taxi-parks/:taxiParkId/invitations")
  @Roles(ROLE.DIRECTOR)
  @ApiOperation({ summary: "Пригласить водителя в таксопарк" })
  create(
    @Req() req: RequestWithCurrentUser,
    @Param("taxiParkId") taxiParkId: string,
    @Body() dto: CreateDriverInvitationDto,
  ) {
    return this.service.create(req.currentUser.id, taxiParkId, dto);
  }

  @Get("invitations/my")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Мои приглашения" })
  listMy(@Req() req: RequestWithCurrentUser) {
    return this.service.listMy(req.currentUser.id);
  }

  @Patch("invitations/:id/accept")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Принять приглашение" })
  accept(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.accept(req.currentUser.id, id);
  }

  @Patch("invitations/:id/reject")
  @Roles(ROLE.DRIVER)
  @ApiOperation({ summary: "Отклонить приглашение" })
  reject(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.reject(req.currentUser.id, id);
  }

  @Delete("invitations/:id")
  @Roles(ROLE.DIRECTOR)
  @ApiOkResponse({ description: "Deleted" })
  @ApiOperation({ summary: "Отменить приглашение" })
  remove(@Req() req: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.remove(req.currentUser.id, id);
  }
}

