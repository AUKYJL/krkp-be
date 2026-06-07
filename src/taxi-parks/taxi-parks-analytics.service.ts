import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Car, Driver, Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { GetTaxiParkAnalyticsQueryDto } from "../analytics/dto/get-taxi-park-analytics-query.dto";
import { GetTaxiParkAnalyticsResponseDto } from "../analytics/dto/get-taxi-park-analytics-response.dto";
import { GetTaxiParksAnalyticsQueryDto } from "./dto/get-taxi-parks-analytics-query.dto";
import { GetTaxiParksAnalyticsResponseDto } from "./dto/get-taxi-parks-analytics-response.dto";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TOP_LIMIT = 10;

type DriverWithUser = Driver & {
  user: User;
};

type WorkDayWithRelations = Prisma.WorkDayGetPayload<{
  include: {
    driver: {
      include: {
        user: true;
      };
    };
    car: true;
  };
}>;

type Period = {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
  daysCount: number;
};

type TaxiParkContext = {
  taxiParks: {
    id: string;
    name: string;
    address: string;
  }[];
  cars: Car[];
  drivers: DriverWithUser[];
  workDays: WorkDayWithRelations[];
};

type DriverStat = {
  driverId: string;
  fullName: string;
  taxiParkId: string;
  taxiParkName: string;
  totalRevenue: number;
  onlineDaysCount: number;
  downtimeDaysCount: number;
};

type CarStat = {
  carId: string;
  firm: string;
  model: string;
  plateNumber: string;
  state: Car["state"];
  taxiParkId: string;
  taxiParkName: string;
  totalRevenue: number;
  onlineDaysCount: number;
  downtimeDaysCount: number;
};

type BrandStat = {
  firm: string;
  carsCount: number;
  totalRevenue: number;
  onlineDaysCount: number;
  downtimeDaysCount: number;
};

type TaxiParkAggregate = {
  taxiParkId: string;
  name: string;
  address: string;
  driversCount: number;
  activeDriversCount: number;
  carsCount: number;
  totalRevenue: number;
  workDaysCount: number;
  onlineDaysCount: number;
  downtimeDaysCount: number;
};

@Injectable()
export class TaxiParksAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllTaxiParksAnalytics(
    userId: string,
    query: GetTaxiParksAnalyticsQueryDto,
  ): Promise<GetTaxiParksAnalyticsResponseDto> {
    const period = this.resolvePeriod(query);
    const context = await this.loadDirectorContext(userId, period);

    return this.buildAllTaxiParksAnalytics(period, context);
  }

  async getTaxiParkAnalytics(
    userId: string,
    taxiParkId: string,
    query: GetTaxiParkAnalyticsQueryDto,
  ): Promise<GetTaxiParkAnalyticsResponseDto> {
    const period = this.resolvePeriod(query);
    const context = await this.loadDirectorContext(userId, period, taxiParkId);
    const taxiPark = context.taxiParks.find((item) => item.id === taxiParkId);

    if (!taxiPark) {
      throw new NotFoundException("Taxi park not found");
    }

    return this.buildSingleTaxiParkAnalytics(period, taxiParkId, context);
  }

  private async loadDirectorContext(
    userId: string,
    period: Period,
    taxiParkId?: string,
  ): Promise<TaxiParkContext> {
    const director = await this.prisma.director.findUnique({
      where: { userId },
    });

    if (!director) {
      throw new ForbiddenException("Only director allowed");
    }

    const taxiParks = await this.prisma.taxiPark.findMany({
      where: {
        directorId: director.id,
        ...(taxiParkId ? { id: taxiParkId } : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (taxiParkId && taxiParks.length === 0) {
      throw new NotFoundException("Taxi park not found");
    }

    const taxiParkIds = taxiParks.map((item) => item.id);

    const [cars, drivers] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.prisma.driver.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const carIds = cars.map((item) => item.id);
    const driverIds = drivers.map((item) => item.id);

    const workDays =
      taxiParkIds.length === 0 || carIds.length === 0 || driverIds.length === 0
        ? []
        : await this.prisma.workDay.findMany({
            where: {
              workDate: {
                gte: period.fromDate,
                lte: period.toDate,
              },
              driverId: { in: driverIds },
              carId: { in: carIds },
              driver: {
                taxiParkId: { in: taxiParkIds },
              },
              car: {
                taxiParkId: { in: taxiParkIds },
              },
            },
            include: {
              driver: {
                include: {
                  user: true,
                },
              },
              car: true,
            },
            orderBy: {
              workDate: "asc",
            },
          });

    return {
      taxiParks,
      cars,
      drivers,
      workDays,
    };
  }

  private buildAllTaxiParksAnalytics(
    period: Period,
    context: TaxiParkContext,
  ): GetTaxiParksAnalyticsResponseDto {
    const taxiParksById = new Map(
      context.taxiParks.map((item) => [item.id, item] as const),
    );
    const driversCountByParkId = new Map<string, number>();
    const carsCountByParkId = new Map<string, number>();
    const activeDriverIds = new Set<string>();
    const activeDriverIdsByParkId = new Map<string, Set<string>>();
    const revenueByDayMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        onlineCarsCount: number;
        downtimeCarsCount: number;
      }
    >();
    const driverStats = new Map<string, DriverStat>();
    const carStats = new Map<string, CarStat>();
    const brandStats = new Map<string, BrandStat>();
    const taxiParkAggregates = new Map<string, TaxiParkAggregate>();

    for (const date of this.getDateRange(period.from, period.to)) {
      revenueByDayMap.set(date, {
        date,
        revenue: 0,
        onlineCarsCount: 0,
        downtimeCarsCount: 0,
      });
    }

    for (const taxiPark of context.taxiParks) {
      driversCountByParkId.set(taxiPark.id, 0);
      carsCountByParkId.set(taxiPark.id, 0);
      activeDriverIdsByParkId.set(taxiPark.id, new Set<string>());
      taxiParkAggregates.set(taxiPark.id, {
        taxiParkId: taxiPark.id,
        name: taxiPark.name,
        address: taxiPark.address,
        driversCount: 0,
        activeDriversCount: 0,
        carsCount: 0,
        totalRevenue: 0,
        workDaysCount: 0,
        onlineDaysCount: 0,
        downtimeDaysCount: 0,
      });
    }

    for (const driver of context.drivers) {
      if (!driver.taxiParkId) {
        continue;
      }

      driversCountByParkId.set(
        driver.taxiParkId,
        (driversCountByParkId.get(driver.taxiParkId) ?? 0) + 1,
      );

      const taxiPark = taxiParksById.get(driver.taxiParkId);
      if (!taxiPark) {
        continue;
      }

      driverStats.set(driver.id, {
        driverId: driver.id,
        fullName: driver.user.fullName,
        taxiParkId: taxiPark.id,
        taxiParkName: taxiPark.name,
        totalRevenue: 0,
        onlineDaysCount: 0,
        downtimeDaysCount: 0,
      });
    }

    for (const car of context.cars) {
      carsCountByParkId.set(
        car.taxiParkId,
        (carsCountByParkId.get(car.taxiParkId) ?? 0) + 1,
      );

      const taxiPark = taxiParksById.get(car.taxiParkId);
      if (!taxiPark) {
        continue;
      }

      carStats.set(car.id, {
        carId: car.id,
        firm: car.firm,
        model: car.model,
        plateNumber: car.plateNumber,
        state: car.state,
        taxiParkId: taxiPark.id,
        taxiParkName: taxiPark.name,
        totalRevenue: 0,
        onlineDaysCount: 0,
        downtimeDaysCount: 0,
      });

      brandStats.set(car.firm, {
        firm: car.firm,
        carsCount: (brandStats.get(car.firm)?.carsCount ?? 0) + 1,
        totalRevenue: brandStats.get(car.firm)?.totalRevenue ?? 0,
        onlineDaysCount: brandStats.get(car.firm)?.onlineDaysCount ?? 0,
        downtimeDaysCount: brandStats.get(car.firm)?.downtimeDaysCount ?? 0,
      });
    }

    for (const [taxiParkId, aggregate] of taxiParkAggregates) {
      aggregate.driversCount = driversCountByParkId.get(taxiParkId) ?? 0;
      aggregate.carsCount = carsCountByParkId.get(taxiParkId) ?? 0;
    }

    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    for (const workDay of context.workDays) {
      const driverTaxiParkId = workDay.driver.taxiParkId;
      const carTaxiParkId = workDay.car.taxiParkId;

      if (!driverTaxiParkId || driverTaxiParkId !== carTaxiParkId) {
        continue;
      }

      const taxiPark = taxiParksById.get(driverTaxiParkId);
      if (!taxiPark) {
        continue;
      }

      const date = this.formatDate(workDay.workDate);
      const revenue = Number(workDay.revenue);
      const revenueByDayEntry = revenueByDayMap.get(date);
      const taxiParkAggregate = taxiParkAggregates.get(taxiPark.id);

      if (revenueByDayEntry) {
        revenueByDayEntry.revenue += revenue;
        if (workDay.carOnLine) {
          revenueByDayEntry.onlineCarsCount += 1;
        } else {
          revenueByDayEntry.downtimeCarsCount += 1;
        }
      }

      if (taxiParkAggregate) {
        taxiParkAggregate.totalRevenue += revenue;
        taxiParkAggregate.workDaysCount += 1;
        if (workDay.carOnLine) {
          taxiParkAggregate.onlineDaysCount += 1;
        } else {
          taxiParkAggregate.downtimeDaysCount += 1;
        }
      }

      totalRevenue += revenue;
      activeDriverIds.add(workDay.driverId);
      activeDriverIdsByParkId.get(taxiPark.id)?.add(workDay.driverId);

      const driverStat = driverStats.get(workDay.driverId);
      if (driverStat) {
        driverStat.totalRevenue += revenue;
        if (workDay.carOnLine) {
          driverStat.onlineDaysCount += 1;
        } else {
          driverStat.downtimeDaysCount += 1;
        }
      }

      const carStat = carStats.get(workDay.carId);
      if (carStat) {
        carStat.totalRevenue += revenue;
        if (workDay.carOnLine) {
          carStat.onlineDaysCount += 1;
        } else {
          carStat.downtimeDaysCount += 1;
        }
      }

      const brandStat = brandStats.get(workDay.car.firm);
      if (brandStat) {
        brandStat.totalRevenue += revenue;
        if (workDay.carOnLine) {
          brandStat.onlineDaysCount += 1;
        } else {
          brandStat.downtimeDaysCount += 1;
        }
      }

      if (workDay.carOnLine) {
        onlineDaysCount += 1;
      } else {
        downtimeDaysCount += 1;
      }
    }

    for (const [taxiParkId, aggregate] of taxiParkAggregates) {
      aggregate.activeDriversCount = activeDriverIdsByParkId.get(taxiParkId)?.size ?? 0;
    }

    const workDaysCount = onlineDaysCount + downtimeDaysCount;
    const averageRevenuePerOnlineDay = this.safeDivide(totalRevenue, onlineDaysCount);

    const revenueByDay = Array.from(revenueByDayMap.values()).map((entry) => ({
      ...entry,
      revenue: this.roundMoney(entry.revenue),
    }));

    const revenueByTaxiPark = Array.from(taxiParkAggregates.values())
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.name.localeCompare(right.name);
      })
      .map((aggregate) => ({
        taxiParkId: aggregate.taxiParkId,
        taxiParkName: aggregate.name,
        revenue: this.roundMoney(aggregate.totalRevenue),
      }));

    const taxiParks = Array.from(taxiParkAggregates.values())
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.name.localeCompare(right.name);
      })
      .map((aggregate) => {
        const parkAverageRevenuePerOnlineDay = this.safeDivide(
          aggregate.totalRevenue,
          aggregate.onlineDaysCount,
        );

        return {
          taxiParkId: aggregate.taxiParkId,
          name: aggregate.name,
          address: aggregate.address,
          driversCount: aggregate.driversCount,
          activeDriversCount: aggregate.activeDriversCount,
          carsCount: aggregate.carsCount,
          totalRevenue: this.roundMoney(aggregate.totalRevenue),
          averageRevenuePerDay: this.roundMoney(
            this.safeDivide(aggregate.totalRevenue, period.daysCount),
          ),
          averageRevenuePerActiveDriver: this.roundMoney(
            this.safeDivide(aggregate.totalRevenue, aggregate.activeDriversCount),
          ),
          averageRevenuePerCar: this.roundMoney(
            this.safeDivide(aggregate.totalRevenue, aggregate.carsCount),
          ),
          workDaysCount: aggregate.workDaysCount,
          onlineDaysCount: aggregate.onlineDaysCount,
          downtimeDaysCount: aggregate.downtimeDaysCount,
          onlineRate: this.roundPercent(
            this.safeDivide(aggregate.onlineDaysCount * 100, aggregate.workDaysCount),
          ),
          downtimeRate: this.roundPercent(
            this.safeDivide(aggregate.downtimeDaysCount * 100, aggregate.workDaysCount),
          ),
          estimatedDowntimeLoss: this.roundMoney(
            parkAverageRevenuePerOnlineDay * aggregate.downtimeDaysCount,
          ),
        };
      });

    const topDrivers = Array.from(driverStats.values())
      .filter(
        (driverStat) =>
          driverStat.totalRevenue > 0 ||
          driverStat.onlineDaysCount > 0 ||
          driverStat.downtimeDaysCount > 0,
      )
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.fullName.localeCompare(right.fullName);
      })
      .slice(0, TOP_LIMIT)
      .map((driverStat, index) => ({
        driverId: driverStat.driverId,
        fullName: driverStat.fullName,
        taxiParkId: driverStat.taxiParkId,
        taxiParkName: driverStat.taxiParkName,
        totalRevenue: this.roundMoney(driverStat.totalRevenue),
        averageRevenuePerOnlineDay: this.roundMoney(
          this.safeDivide(driverStat.totalRevenue, driverStat.onlineDaysCount),
        ),
        onlineDaysCount: driverStat.onlineDaysCount,
        downtimeDaysCount: driverStat.downtimeDaysCount,
        activityRate: this.roundPercent(
          this.safeDivide(driverStat.onlineDaysCount * 100, period.daysCount),
        ),
        rank: index + 1,
      }));

    const topCars = Array.from(carStats.values())
      .filter(
        (carStat) =>
          carStat.totalRevenue > 0 ||
          carStat.onlineDaysCount > 0 ||
          carStat.downtimeDaysCount > 0,
      )
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.plateNumber.localeCompare(right.plateNumber);
      })
      .slice(0, TOP_LIMIT)
      .map((carStat) => ({
        carId: carStat.carId,
        firm: carStat.firm,
        model: carStat.model,
        plateNumber: carStat.plateNumber,
        state: carStat.state,
        taxiParkId: carStat.taxiParkId,
        taxiParkName: carStat.taxiParkName,
        totalRevenue: this.roundMoney(carStat.totalRevenue),
        averageRevenuePerOnlineDay: this.roundMoney(
          this.safeDivide(carStat.totalRevenue, carStat.onlineDaysCount),
        ),
        onlineDaysCount: carStat.onlineDaysCount,
        downtimeDaysCount: carStat.downtimeDaysCount,
        utilizationRate: this.roundPercent(
          this.safeDivide(carStat.onlineDaysCount * 100, period.daysCount),
        ),
      }));

    const topBrands = Array.from(brandStats.values())
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.firm.localeCompare(right.firm);
      })
      .slice(0, TOP_LIMIT)
      .map((brandStat) => ({
        firm: brandStat.firm,
        carsCount: brandStat.carsCount,
        totalRevenue: this.roundMoney(brandStat.totalRevenue),
        averageRevenuePerCar: this.roundMoney(
          this.safeDivide(brandStat.totalRevenue, brandStat.carsCount),
        ),
        onlineDaysCount: brandStat.onlineDaysCount,
        downtimeDaysCount: brandStat.downtimeDaysCount,
        utilizationRate: this.roundPercent(
          this.safeDivide(
            brandStat.onlineDaysCount * 100,
            brandStat.carsCount * period.daysCount,
          ),
        ),
      }));

    const problemTaxiParks = taxiParks
      .filter((taxiPark) => taxiPark.downtimeDaysCount > 0)
      .sort((left, right) => {
        if (right.downtimeDaysCount !== left.downtimeDaysCount) {
          return right.downtimeDaysCount - left.downtimeDaysCount;
        }
        if (right.downtimeRate !== left.downtimeRate) {
          return right.downtimeRate - left.downtimeRate;
        }
        return right.estimatedDowntimeLoss - left.estimatedDowntimeLoss;
      })
      .slice(0, TOP_LIMIT)
      .map((taxiPark) => ({
        taxiParkId: taxiPark.taxiParkId,
        name: taxiPark.name,
        downtimeDaysCount: taxiPark.downtimeDaysCount,
        downtimeRate: taxiPark.downtimeRate,
        estimatedDowntimeLoss: taxiPark.estimatedDowntimeLoss,
      }));

    const problemCars = Array.from(carStats.values())
      .filter((carStat) => carStat.downtimeDaysCount > 0)
      .sort((left, right) => {
        if (right.downtimeDaysCount !== left.downtimeDaysCount) {
          return right.downtimeDaysCount - left.downtimeDaysCount;
        }
        const rightLoss =
          this.safeDivide(right.totalRevenue, right.onlineDaysCount) * right.downtimeDaysCount;
        const leftLoss =
          this.safeDivide(left.totalRevenue, left.onlineDaysCount) * left.downtimeDaysCount;
        return rightLoss - leftLoss;
      })
      .slice(0, TOP_LIMIT)
      .map((carStat) => ({
        carId: carStat.carId,
        firm: carStat.firm,
        model: carStat.model,
        plateNumber: carStat.plateNumber,
        taxiParkId: carStat.taxiParkId,
        taxiParkName: carStat.taxiParkName,
        downtimeDaysCount: carStat.downtimeDaysCount,
        estimatedLoss: this.roundMoney(
          this.safeDivide(carStat.totalRevenue, carStat.onlineDaysCount) *
            carStat.downtimeDaysCount,
        ),
      }));

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      summary: {
        taxiParksCount: context.taxiParks.length,
        driversCount: context.drivers.length,
        activeDriversCount: activeDriverIds.size,
        carsCount: context.cars.length,
        totalRevenue: this.roundMoney(totalRevenue),
        averageRevenuePerDay: this.roundMoney(
          this.safeDivide(totalRevenue, period.daysCount),
        ),
        averageRevenuePerTaxiPark: this.roundMoney(
          this.safeDivide(totalRevenue, context.taxiParks.length),
        ),
        averageRevenuePerActiveDriver: this.roundMoney(
          this.safeDivide(totalRevenue, activeDriverIds.size),
        ),
        averageRevenuePerCar: this.roundMoney(
          this.safeDivide(totalRevenue, context.cars.length),
        ),
        workDaysCount,
        onlineDaysCount,
        downtimeDaysCount,
        onlineRate: this.roundPercent(
          this.safeDivide(onlineDaysCount * 100, workDaysCount),
        ),
        downtimeRate: this.roundPercent(
          this.safeDivide(downtimeDaysCount * 100, workDaysCount),
        ),
        estimatedDowntimeLoss: this.roundMoney(
          averageRevenuePerOnlineDay * downtimeDaysCount,
        ),
      },
      charts: {
        revenueByDay,
        revenueByTaxiPark,
        downtimeByDay: revenueByDay.map((entry) => ({
          date: entry.date,
          downtimeCarsCount: entry.downtimeCarsCount,
        })),
      },
      taxiParks,
      topDrivers,
      topCars,
      topBrands,
      problemTaxiParks,
      problemCars,
    };
  }

  private buildSingleTaxiParkAnalytics(
    period: Period,
    taxiParkId: string,
    context: TaxiParkContext,
  ): GetTaxiParkAnalyticsResponseDto {
    const taxiPark = context.taxiParks.find((item) => item.id === taxiParkId);

    if (!taxiPark) {
      throw new NotFoundException("Taxi park not found");
    }

    const drivers = context.drivers.filter((driver) => driver.taxiParkId === taxiParkId);
    const cars = context.cars.filter((car) => car.taxiParkId === taxiParkId);
    const workDays = context.workDays.filter(
      (workDay) =>
        workDay.driver.taxiParkId === taxiParkId && workDay.car.taxiParkId === taxiParkId,
    );

    const revenueByDayMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        onlineCarsCount: number;
        downtimeCarsCount: number;
      }
    >();
    const driverStats = new Map<
      string,
      {
        driverId: string;
        fullName: string;
        totalRevenue: number;
        onlineDaysCount: number;
        downtimeDaysCount: number;
      }
    >();
    const carStats = new Map<
      string,
      {
        carId: string;
        firm: string;
        model: string;
        plateNumber: string;
        state: Car["state"];
        totalRevenue: number;
        onlineDaysCount: number;
        downtimeDaysCount: number;
      }
    >();
    const brandStats = new Map<string, BrandStat>();
    const activeDriverIds = new Set<string>();

    for (const date of this.getDateRange(period.from, period.to)) {
      revenueByDayMap.set(date, {
        date,
        revenue: 0,
        onlineCarsCount: 0,
        downtimeCarsCount: 0,
      });
    }

    for (const car of cars) {
      brandStats.set(car.firm, {
        firm: car.firm,
        carsCount: (brandStats.get(car.firm)?.carsCount ?? 0) + 1,
        totalRevenue: brandStats.get(car.firm)?.totalRevenue ?? 0,
        onlineDaysCount: brandStats.get(car.firm)?.onlineDaysCount ?? 0,
        downtimeDaysCount: brandStats.get(car.firm)?.downtimeDaysCount ?? 0,
      });
      carStats.set(car.id, {
        carId: car.id,
        firm: car.firm,
        model: car.model,
        plateNumber: car.plateNumber,
        state: car.state,
        totalRevenue: 0,
        onlineDaysCount: 0,
        downtimeDaysCount: 0,
      });
    }

    for (const driver of drivers) {
      driverStats.set(driver.id, {
        driverId: driver.id,
        fullName: driver.user.fullName,
        totalRevenue: 0,
        onlineDaysCount: 0,
        downtimeDaysCount: 0,
      });
    }

    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    for (const workDay of workDays) {
      const date = this.formatDate(workDay.workDate);
      const revenue = Number(workDay.revenue);
      const dayEntry = revenueByDayMap.get(date);

      if (dayEntry) {
        dayEntry.revenue += revenue;
        if (workDay.carOnLine) {
          dayEntry.onlineCarsCount += 1;
        } else {
          dayEntry.downtimeCarsCount += 1;
        }
      }

      totalRevenue += revenue;
      activeDriverIds.add(workDay.driverId);

      const driverStat = driverStats.get(workDay.driverId);
      if (driverStat) {
        driverStat.totalRevenue += revenue;
        if (workDay.carOnLine) {
          driverStat.onlineDaysCount += 1;
        } else {
          driverStat.downtimeDaysCount += 1;
        }
      }

      const carStat = carStats.get(workDay.carId);
      if (carStat) {
        carStat.totalRevenue += revenue;
        if (workDay.carOnLine) {
          carStat.onlineDaysCount += 1;
        } else {
          carStat.downtimeDaysCount += 1;
        }
      }

      const brandStat = brandStats.get(workDay.car.firm);
      if (brandStat) {
        brandStat.totalRevenue += revenue;
        if (workDay.carOnLine) {
          brandStat.onlineDaysCount += 1;
        } else {
          brandStat.downtimeDaysCount += 1;
        }
      }

      if (workDay.carOnLine) {
        onlineDaysCount += 1;
      } else {
        downtimeDaysCount += 1;
      }
    }

    const workDaysCount = workDays.length;
    const activeDriversCount = activeDriverIds.size;
    const averageRevenuePerOnlineDay = this.safeDivide(totalRevenue, onlineDaysCount);
    const revenueByDay = Array.from(revenueByDayMap.values()).map((entry) => ({
      ...entry,
      revenue: this.roundMoney(entry.revenue),
    }));

    const topDrivers = Array.from(driverStats.values())
      .filter(
        (driverStat) =>
          driverStat.totalRevenue > 0 ||
          driverStat.onlineDaysCount > 0 ||
          driverStat.downtimeDaysCount > 0,
      )
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.fullName.localeCompare(right.fullName);
      })
      .map((driverStat, index) => ({
        driverId: driverStat.driverId,
        fullName: driverStat.fullName,
        totalRevenue: this.roundMoney(driverStat.totalRevenue),
        averageRevenuePerOnlineDay: this.roundMoney(
          this.safeDivide(driverStat.totalRevenue, driverStat.onlineDaysCount),
        ),
        onlineDaysCount: driverStat.onlineDaysCount,
        downtimeDaysCount: driverStat.downtimeDaysCount,
        activityRate: this.roundPercent(
          this.safeDivide(driverStat.onlineDaysCount * 100, period.daysCount),
        ),
        rank: index + 1,
      }));

    const topCars = Array.from(carStats.values())
      .filter(
        (carStat) =>
          carStat.totalRevenue > 0 ||
          carStat.onlineDaysCount > 0 ||
          carStat.downtimeDaysCount > 0,
      )
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.plateNumber.localeCompare(right.plateNumber);
      })
      .map((carStat) => ({
        carId: carStat.carId,
        firm: carStat.firm,
        model: carStat.model,
        plateNumber: carStat.plateNumber,
        state: carStat.state,
        totalRevenue: this.roundMoney(carStat.totalRevenue),
        averageRevenuePerOnlineDay: this.roundMoney(
          this.safeDivide(carStat.totalRevenue, carStat.onlineDaysCount),
        ),
        onlineDaysCount: carStat.onlineDaysCount,
        downtimeDaysCount: carStat.downtimeDaysCount,
        utilizationRate: this.roundPercent(
          this.safeDivide(carStat.onlineDaysCount * 100, period.daysCount),
        ),
      }));

    const topBrands = Array.from(brandStats.values())
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }
        return left.firm.localeCompare(right.firm);
      })
      .map((brandStat) => ({
        firm: brandStat.firm,
        carsCount: brandStat.carsCount,
        totalRevenue: this.roundMoney(brandStat.totalRevenue),
        averageRevenuePerCar: this.roundMoney(
          this.safeDivide(brandStat.totalRevenue, brandStat.carsCount),
        ),
        onlineDaysCount: brandStat.onlineDaysCount,
        downtimeDaysCount: brandStat.downtimeDaysCount,
        utilizationRate: this.roundPercent(
          this.safeDivide(
            brandStat.onlineDaysCount * 100,
            brandStat.carsCount * period.daysCount,
          ),
        ),
      }));

    const problemCars = Array.from(carStats.values())
      .filter((carStat) => carStat.downtimeDaysCount > 0)
      .sort((left, right) => {
        if (right.downtimeDaysCount !== left.downtimeDaysCount) {
          return right.downtimeDaysCount - left.downtimeDaysCount;
        }
        const rightLoss =
          this.safeDivide(right.totalRevenue, right.onlineDaysCount) * right.downtimeDaysCount;
        const leftLoss =
          this.safeDivide(left.totalRevenue, left.onlineDaysCount) * left.downtimeDaysCount;
        return rightLoss - leftLoss;
      })
      .map((carStat) => ({
        carId: carStat.carId,
        firm: carStat.firm,
        model: carStat.model,
        plateNumber: carStat.plateNumber,
        downtimeDaysCount: carStat.downtimeDaysCount,
        estimatedLoss: this.roundMoney(
          this.safeDivide(carStat.totalRevenue, carStat.onlineDaysCount) *
            carStat.downtimeDaysCount,
        ),
      }));

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      summary: {
        totalRevenue: this.roundMoney(totalRevenue),
        averageRevenuePerDay: this.roundMoney(
          this.safeDivide(totalRevenue, period.daysCount),
        ),
        averageRevenuePerActiveDriver: this.roundMoney(
          this.safeDivide(totalRevenue, activeDriversCount),
        ),
        averageRevenuePerCar: this.roundMoney(
          this.safeDivide(totalRevenue, cars.length),
        ),
        driversCount: drivers.length,
        activeDriversCount,
        carsCount: cars.length,
        workDaysCount,
        onlineDaysCount,
        downtimeDaysCount,
        onlineRate: this.roundPercent(
          this.safeDivide(onlineDaysCount * 100, workDaysCount),
        ),
        downtimeRate: this.roundPercent(
          this.safeDivide(downtimeDaysCount * 100, workDaysCount),
        ),
        estimatedDowntimeLoss: this.roundMoney(
          averageRevenuePerOnlineDay * downtimeDaysCount,
        ),
      },
      charts: {
        revenueByDay,
        downtimeByDay: revenueByDay.map((entry) => ({
          date: entry.date,
          downtimeCarsCount: entry.downtimeCarsCount,
        })),
      },
      topDrivers,
      topCars,
      topBrands,
      problemCars,
    };
  }

  private resolvePeriod(
    query: GetTaxiParksAnalyticsQueryDto | GetTaxiParkAnalyticsQueryDto,
  ): Period {
    const today = new Date();
    const defaultFrom = this.formatDate(
      new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)),
    );
    const defaultTo = this.formatDate(
      new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())),
    );

    const from = query.from ?? defaultFrom;
    const to = query.to ?? defaultTo;
    const fromDateOnly = this.parseDateString(from);
    const toDateOnly = this.parseDateString(to);

    if (fromDateOnly.getTime() > toDateOnly.getTime()) {
      throw new BadRequestException("'from' must be less than or equal to 'to'");
    }

    return {
      from,
      to,
      fromDate: new Date(`${from}T00:00:00.000Z`),
      toDate: new Date(`${to}T23:59:59.999Z`),
      daysCount:
        Math.floor((toDateOnly.getTime() - fromDateOnly.getTime()) / DAY_IN_MS) + 1,
    };
  }

  private parseDateString(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException("Date must have YYYY-MM-DD format");
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (this.formatDate(date) !== value) {
      throw new BadRequestException(`Invalid date value: ${value}`);
    }

    return date;
  }

  private getDateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const fromDate = this.parseDateString(from);
    const toDate = this.parseDateString(to);

    for (
      let currentTime = fromDate.getTime();
      currentTime <= toDate.getTime();
      currentTime += DAY_IN_MS
    ) {
      dates.push(this.formatDate(new Date(currentTime)));
    }

    return dates;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private safeDivide(numerator: number, denominator: number): number {
    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundPercent(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
