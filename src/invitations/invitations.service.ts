import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InvitationStatus, Prisma } from "@prisma/client";
import { ActionLogsService } from "../action-logs/action-logs.service";
import { PrismaService } from "../prisma/prisma.service";
import { LOG_EVENTS } from "../shared/consts/log-events";
import { CreateDriverInvitationDto } from "./dto/create-driver-invitation.dto";

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private actionLogs: ActionLogsService,
  ) {}

  private async getDirectorIdByUserId(userId: string) {
    const director = await this.prisma.director.findUnique({
      where: { userId },
    });
    if (!director) throw new ForbiddenException("Only director allowed");
    return director.id;
  }

  private async assertDirectorTaxiParkAccess(userId: string, taxiParkId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const taxiPark = await this.prisma.taxiPark.findUnique({
      where: { id: taxiParkId },
      select: { id: true, directorId: true },
    });
    if (!taxiPark) throw new NotFoundException("Taxi park not found");
    if (taxiPark.directorId !== directorId) throw new ForbiddenException();
  }

  async create(userId: string, taxiParkId: string, dto: CreateDriverInvitationDto) {
    await this.assertDirectorTaxiParkAccess(userId, taxiParkId);

    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
      select: { id: true, taxiParkId: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (driver.taxiParkId) throw new BadRequestException("Driver already in taxi park");

    let invitation;
    try {
      invitation = await this.prisma.driverInvitation.create({
        data: { taxiParkId, driverId: dto.driverId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("Invitation already exists");
      }
      throw error;
    }

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.INVITE_DRIVER,
      `Invite driver ${dto.driverId}`,
      taxiParkId,
      { invitationId: invitation.id, driverId: dto.driverId },
    );

    return invitation;
  }

  async listMy(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    const invitations = await this.prisma.driverInvitation.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        taxiPark: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return invitations.map((invitation) => ({
      invitationId: invitation.id,
      status: invitation.status,
      createdAt: invitation.createdAt,
      taxiPark: invitation.taxiPark,
    }));
  }

  private async getMyInvitationOrThrow(userId: string, invitationId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    const invitation = await this.prisma.driverInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.driverId !== driver.id) throw new ForbiddenException();
    return invitation;
  }

  async accept(userId: string, invitationId: string) {
    const invitation = await this.getMyInvitationOrThrow(userId, invitationId);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is not pending");
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: invitation.driverId },
      select: { id: true, taxiParkId: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (driver.taxiParkId) {
      throw new BadRequestException("Driver already in taxi park");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const acceptedInvitation = await tx.driverInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED },
      });

      await tx.driver.update({
        where: { id: invitation.driverId },
        data: { taxiParkId: invitation.taxiParkId },
      });

      return acceptedInvitation;
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.ACCEPT_INVITATION,
      `Accept invitation ${invitationId}`,
      invitation.taxiParkId,
      { invitationId, driverId: invitation.driverId },
    );

    return updated;
  }

  async reject(userId: string, invitationId: string) {
    const invitation = await this.getMyInvitationOrThrow(userId, invitationId);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is not pending");
    }

    const updated = await this.prisma.driverInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REJECTED },
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.REJECT_INVITATION,
      `Reject invitation ${invitationId}`,
      invitation.taxiParkId,
      { invitationId, driverId: invitation.driverId },
    );

    return updated;
  }

  async remove(userId: string, invitationId: string) {
    const directorId = await this.getDirectorIdByUserId(userId);
    const invitation = await this.prisma.driverInvitation.findUnique({
      where: { id: invitationId },
      include: { taxiPark: { select: { directorId: true } } },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.taxiPark.directorId !== directorId) throw new ForbiddenException();

    const deleted = await this.prisma.driverInvitation.delete({
      where: { id: invitationId },
    });

    await this.actionLogs.createLog(
      userId,
      LOG_EVENTS.CANCEL_INVITATION,
      `Cancel invitation ${invitationId}`,
      invitation.taxiParkId,
      { invitationId, driverId: invitation.driverId },
    );

    return deleted;
  }
}
