import { Injectable } from "@nestjs/common";
import { CarState, WorkDayStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const MOSCOW_TIME_ZONE = "Europe/Moscow";

@Injectable()
export class WorkDaysSettlementService {
  constructor(private prisma: PrismaService) {}

  private getMoscowDateKey(date: Date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: MOSCOW_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private getMoscowDayBounds(date: Date) {
    const dayKey = this.getMoscowDateKey(date);
    const [year, month, day] = dayKey.split("-");
    const start = new Date(`${year}-${month}-${day}T00:00:00+03:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  async settleCurrentBusinessDay(now = new Date()) {
    const { start, end } = this.getMoscowDayBounds(now);
    const drivers = await this.prisma.driver.findMany({
      select: {
        id: true,
        assignedCarId: true,
        taxiParkId: true,
      },
    });

    let created = 0;
    let updated = 0;

    for (const driver of drivers) {
      if (!driver.assignedCarId) {
        continue;
      }

      const car = await this.prisma.car.findUnique({
        where: { id: driver.assignedCarId },
        select: { id: true, state: true, taxiParkId: true },
      });
      if (!car) {
        continue;
      }

      if (driver.taxiParkId && car.taxiParkId !== driver.taxiParkId) {
        continue;
      }

      const workDay = await this.prisma.workDay.findFirst({
        where: {
          driverId: driver.id,
          workDate: {
            gte: start,
            lt: end,
          },
        },
        orderBy: { startedAt: "desc" },
      });

      if (!workDay) {
        await this.prisma.workDay.create({
          data: {
            driverId: driver.id,
            carId: car.id,
            workDate: start,
            startedAt: start,
            finishedAt: start,
            revenue: 0,
            carOnLine: car.state === CarState.WORKING,
            status: WorkDayStatus.DOWNTIME,
          },
        });
        created += 1;
        continue;
      }

      if (
        workDay.status !== WorkDayStatus.DOWNTIME &&
        Number(workDay.revenue) <= 0
      ) {
        await this.prisma.workDay.update({
          where: { id: workDay.id },
          data: {
            finishedAt: workDay.finishedAt ?? start,
            status: WorkDayStatus.DOWNTIME,
          },
        });
        updated += 1;
      }
    }

    return { created, updated };
  }
}
