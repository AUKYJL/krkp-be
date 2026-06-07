import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Car, Driver, Prisma, User, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { GetDirectorDashboardQueryDto } from "./dto/get-director-dashboard-query.dto";
import { GetDirectorDashboardResponseDto } from "./dto/get-director-dashboard-response.dto";
import { GetDriverDashboardQueryDto } from "./dto/get-driver-dashboard-query.dto";
import { GetDriverDashboardResponseDto } from "./dto/get-driver-dashboard-response.dto";
import { GetTaxiParkAnalyticsQueryDto } from "./dto/get-taxi-park-analytics-query.dto";
import {
  GetCarBrandsAnalyticsQueryDto,
  GetCarBrandsAnalyticsResponseDto,
} from "./dto/get-car-brands-analytics.dto";
import {
  GetCarAnalyticsResponseDto,
  GetDriverAnalyticsResponseDto,
  GetTaxiParkAnalyticsResponseDto,
} from "./dto/get-taxi-park-analytics-response.dto";
import { GetTaxiParksAnalyticsQueryDto } from "../taxi-parks/dto/get-taxi-parks-analytics-query.dto";
import { GetDriverAnalyticsQueryDto } from "./dto/get-driver-analytics-query.dto";
import { AnalyticsPeriodQueryDto } from "./dto/analytics-period-query.dto";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TOP_BRANDS_LIMIT = 10;
const TOP_RESULTS_LIMIT = 20;
const DIRECTOR_DASHBOARD_TOP_LIMIT = 10;

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

type DriverWithUser = Driver & {
  user: User;
};

type DriverWithUserAndAssignedCar = DriverWithUser & {
  assignedCar: Car | null;
};

type DriverStat = {
  driverId: string;
  fullName: string;
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

type Period = {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
  daysCount: number;
};

type TaxiParkAccess = {
  taxiParks: {
    id: string;
    name: string;
    address: string;
  }[];
  taxiParkIds: string[];
};

type RevenueByDayEntry = {
  date: string;
  revenue: number;
  onlineCarsCount: number;
  downtimeCarsCount: number;
};

type DriverRevenueResponse = {
  driverId: string;
  fullName: string;
  period: {
    from: string;
    to: string;
    daysCount: number;
  };
  summary: {
    totalRevenue: number;
    averageRevenuePerDay: number;
    averageRevenuePerOnlineDay: number;
    workDaysCount: number;
    onlineDaysCount: number;
    downtimeDaysCount: number;
    activityRate: number;
    downtimeRate: number;
  };
  revenueByDay: {
    date: string;
    revenue: number;
    carOnLine: boolean;
  }[];
};

type TaxiParkRevenueResponse = {
  taxiParkId: string;
  taxiParkName: string;
  period: {
    from: string;
    to: string;
    daysCount: number;
  };
  summary: {
    totalRevenue: number;
    averageRevenuePerDay: number;
    averageRevenuePerActiveDriver: number;
    averageRevenuePerCar: number;
    driversCount: number;
    activeDriversCount: number;
    carsCount: number;
    workDaysCount: number;
    onlineDaysCount: number;
    downtimeDaysCount: number;
    onlineRate: number;
    downtimeRate: number;
    estimatedDowntimeLoss: number;
  };
  revenueByDay: RevenueByDayEntry[];
};

type AllRevenueResponse = {
  period: {
    from: string;
    to: string;
    daysCount: number;
  };
  summary: {
    taxiParksCount: number;
    totalRevenue: number;
    averageRevenuePerDay: number;
    averageRevenuePerTaxiPark: number;
    workDaysCount: number;
    onlineDaysCount: number;
    downtimeDaysCount: number;
    onlineRate: number;
    downtimeRate: number;
    estimatedDowntimeLoss: number;
  };
  revenueByTaxiPark: {
    taxiParkId: string;
    taxiParkName: string;
    revenue: number;
  }[];
  revenueByDay: RevenueByDayEntry[];
};

type BrandRevenueResponse = {
  firm: string;
  carsCount: number;
  totalRevenue: number;
  averageRevenuePerCar: number;
  onlineDaysCount: number;
  downtimeDaysCount: number;
  utilizationRate: number;
};

type CarDowntimeResponse = {
  carId: string;
  firm: string;
  model: string;
  plateNumber: string;
  state: Car["state"];
  taxiParkId: string;
  taxiParkName: string;
  downtimeDaysCount: number;
  dates: string[];
};

type BrokenBrandResponse = {
  firm: string;
  carsCount: number;
  downtimeDaysCount: number;
  downtimeRate: number;
};

type DriverRatingResponse = {
  rank: number;
  driverId: string;
  fullName: string;
  taxiParkId: string;
  taxiParkName: string;
  totalRevenue: number;
  averageRevenuePerOnlineDay: number;
  onlineDaysCount: number;
  downtimeDaysCount: number;
  activityRate: number;
};

type DowntimeLossesResponse = {
  period: {
    from: string;
    to: string;
    daysCount: number;
  };
  summary: {
    totalRevenue: number;
    onlineDaysCount: number;
    downtimeDaysCount: number;
    averageRevenuePerOnlineDay: number;
    estimatedDowntimeLoss: number;
  };
  lossesByCar: {
    carId: string;
    firm: string;
    model: string;
    plateNumber: string;
    taxiParkId: string;
    taxiParkName: string;
    onlineDaysCount: number;
    downtimeDaysCount: number;
    averageRevenuePerOnlineDay: number;
    estimatedLoss: number;
  }[];
  lossesByDay: {
    date: string;
    downtimeCarsCount: number;
    estimatedLoss: number;
  }[];
};

type CarAnalyticsRevenueByDayEntry = {
  date: string;
  revenue: number;
  carOnLine: boolean;
};

type DriverWorkDayWithCar = Prisma.WorkDayGetPayload<{
  include: {
    car: true;
  };
}>;

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDirectorDashboard(
    userId: string,
    query: GetDirectorDashboardQueryDto,
  ): Promise<GetDirectorDashboardResponseDto> {
    await this.assertUserRole(userId, UserRole.DIRECTOR);

    const period = this.resolvePeriod(query);
    const { taxiParks, taxiParkIds } = await this.getAllowedTaxiParkIds(userId);
    const [cars, drivers, workDays] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.prisma.driver.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
        include: { user: true, assignedCar: true },
        orderBy: { createdAt: "asc" },
      }),
      this.getWorkDaysForTaxiParks(period, taxiParkIds),
    ]);

    return this.buildDirectorDashboard(period, taxiParks, cars, drivers, workDays);
  }

  async getDriverDashboard(
    userId: string,
    query: GetDriverDashboardQueryDto,
  ): Promise<GetDriverDashboardResponseDto> {
    await this.assertUserRole(userId, UserRole.DRIVER);

    const period = this.resolvePeriod(query);
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: true,
        taxiPark: true,
        assignedCar: true,
      },
    });

    if (!driver) {
      throw new NotFoundException("Driver not found");
    }

    if (!driver.taxiParkId || !driver.taxiPark) {
      throw new ForbiddenException("Driver is not assigned to a taxi park");
    }

    const [workDays, drivers, taxiParkWorkDays] = await Promise.all([
      this.prisma.workDay.findMany({
        where: {
          driverId: driver.id,
          workDate: {
            gte: period.fromDate,
            lte: period.toDate,
          },
          driver: {
            taxiParkId: driver.taxiParkId,
          },
          car: {
            taxiParkId: driver.taxiParkId,
          },
        },
        include: {
          car: true,
        },
        orderBy: {
          workDate: "asc",
        },
      }),
      this.prisma.driver.findMany({
        where: {
          taxiParkId: driver.taxiParkId,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      this.getWorkDaysForTaxiParks(period, [driver.taxiParkId]),
    ]);

    return this.buildDriverAnalytics(
      period,
      driver.taxiParkId,
      driver.taxiPark.name,
      driver,
      workDays,
      drivers,
      taxiParkWorkDays,
    );
  }

  async getTaxiParkAnalytics(
    userId: string,
    taxiParkId: string,
    query: GetTaxiParkAnalyticsQueryDto,
  ): Promise<GetTaxiParkAnalyticsResponseDto> {
    const period = this.resolvePeriod(query);

    const taxiPark = await this.prisma.taxiPark.findUnique({
      where: { id: taxiParkId },
      include: {
        director: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!taxiPark) {
      throw new NotFoundException("Taxi park not found");
    }

    if (taxiPark.director.userId !== userId) {
      throw new ForbiddenException("Access to taxi park analytics is denied");
    }

    const [cars, drivers, workDays] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.prisma.driver.findMany({
        where: { taxiParkId },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      this.prisma.workDay.findMany({
        where: {
          workDate: {
            gte: period.fromDate,
            lte: period.toDate,
          },
          driver: {
            taxiParkId,
          },
          car: {
            taxiParkId,
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
      }),
    ]);

    return this.buildTaxiParkAnalytics(period, drivers, cars, workDays);
  }

  async getCarAnalytics(
    userId: string,
    taxiParkId: string,
    carId: string,
    query: GetTaxiParkAnalyticsQueryDto,
  ): Promise<GetCarAnalyticsResponseDto> {
    const period = this.resolvePeriod(query);

    const taxiPark = await this.prisma.taxiPark.findUnique({
      where: { id: taxiParkId },
      include: {
        director: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!taxiPark) {
      throw new NotFoundException("Taxi park not found");
    }

    if (taxiPark.director.userId !== userId) {
      throw new ForbiddenException("Access to taxi park analytics is denied");
    }

    const car = await this.prisma.car.findFirst({
      where: {
        id: carId,
        taxiParkId,
      },
    });

    if (!car) {
      throw new NotFoundException("Car not found");
    }

    const [assignedDriver, cars, workDays, taxiParkWorkDays] = await Promise.all([
      this.prisma.driver.findFirst({
        where: {
          taxiParkId,
          assignedCarId: carId,
        },
        include: {
          user: true,
        },
      }),
      this.prisma.car.findMany({
        where: { taxiParkId },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.prisma.workDay.findMany({
        where: {
          carId,
          workDate: {
            gte: period.fromDate,
            lte: period.toDate,
          },
          driver: {
            taxiParkId,
          },
          car: {
            taxiParkId,
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
      }),
      this.getWorkDaysForTaxiParks(period, [taxiParkId]),
    ]);

    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    const revenueByDayMap = new Map<string, CarAnalyticsRevenueByDayEntry>();

    for (const date of this.getDateRange(period.from, period.to)) {
      revenueByDayMap.set(date, {
        date,
        revenue: 0,
        carOnLine: false,
      });
    }

    for (const workDay of workDays) {
      const date = this.formatDate(workDay.workDate);
      const revenue = Number(workDay.revenue);

      totalRevenue += revenue;

      if (workDay.carOnLine) {
        onlineDaysCount += 1;
      } else {
        downtimeDaysCount += 1;
      }

      revenueByDayMap.set(date, {
        date,
        revenue: this.roundMoney(revenue),
        carOnLine: workDay.carOnLine,
      });
    }

    const workDaysCount = workDays.length;
    const carsCount = cars.length;
    const averageRevenuePerOnlineDay = this.safeDivide(totalRevenue, onlineDaysCount);
    const utilizationRate = this.safeDivide(onlineDaysCount * 100, period.daysCount);
    const downtimeRate = this.safeDivide(downtimeDaysCount * 100, workDaysCount);

    const brandStats = new Map<string, BrandStat>();
    let taxiParkTotalRevenue = 0;
    let taxiParkOnlineDaysCount = 0;

    for (const taxiParkCar of cars) {
      brandStats.set(taxiParkCar.firm, {
        firm: taxiParkCar.firm,
        carsCount: (brandStats.get(taxiParkCar.firm)?.carsCount ?? 0) + 1,
        totalRevenue: brandStats.get(taxiParkCar.firm)?.totalRevenue ?? 0,
        onlineDaysCount: brandStats.get(taxiParkCar.firm)?.onlineDaysCount ?? 0,
        downtimeDaysCount: brandStats.get(taxiParkCar.firm)?.downtimeDaysCount ?? 0,
      });
    }

    for (const workDay of taxiParkWorkDays) {
      taxiParkTotalRevenue += Number(workDay.revenue);
      if (workDay.carOnLine) {
        taxiParkOnlineDaysCount += 1;
      }

      const brandStat = brandStats.get(workDay.car.firm);
      if (!brandStat) {
        continue;
      }

      brandStat.totalRevenue += Number(workDay.revenue);
      if (workDay.carOnLine) {
        brandStat.onlineDaysCount += 1;
      } else {
        brandStat.downtimeDaysCount += 1;
      }
    }

    const taxiParkAverageRevenuePerCar = this.safeDivide(
      taxiParkTotalRevenue,
      carsCount,
    );
    const taxiParkAverageRevenuePerOnlineDay = this.safeDivide(
      taxiParkTotalRevenue,
      taxiParkOnlineDaysCount,
    );
    const taxiParkAverageUtilizationRate = this.safeDivide(
      taxiParkOnlineDaysCount * 100,
      carsCount * period.daysCount,
    );
    const rankedBrands = Array.from(brandStats.values()).sort((left, right) => {
      if (right.totalRevenue !== left.totalRevenue) {
        return right.totalRevenue - left.totalRevenue;
      }

      return left.firm.localeCompare(right.firm);
    });
    const currentBrandRank =
      rankedBrands.findIndex((brandStat) => brandStat.firm === car.firm) + 1;
    const currentBrandStat = brandStats.get(car.firm) ?? {
      firm: car.firm,
      carsCount: 0,
      totalRevenue: 0,
      onlineDaysCount: 0,
      downtimeDaysCount: 0,
    };
    const currentBrandAverageRevenuePerCar = this.safeDivide(
      currentBrandStat.totalRevenue,
      currentBrandStat.carsCount,
    );

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      car: {
        carId: car.id,
        firm: car.firm,
        model: car.model,
        plateNumber: car.plateNumber,
        state: car.state,
        taxiParkId: car.taxiParkId,
        taxiParkName: taxiPark.name,
        assignedDriver: assignedDriver
          ? {
              driverId: assignedDriver.id,
              fullName: assignedDriver.user.fullName,
            }
          : null,
      },
      summary: {
        totalRevenue: this.roundMoney(totalRevenue),
        averageRevenuePerOnlineDay: this.roundMoney(averageRevenuePerOnlineDay),
        onlineDaysCount,
        downtimeDaysCount,
        workDaysCount,
        utilizationRate: this.roundPercent(utilizationRate),
        downtimeRate: this.roundPercent(downtimeRate),
        estimatedDowntimeLoss: this.roundMoney(
          averageRevenuePerOnlineDay * downtimeDaysCount,
        ),
      },
      comparison: {
        taxiParkAverageRevenuePerCar: this.roundMoney(taxiParkAverageRevenuePerCar),
        taxiParkAverageRevenuePerOnlineDay: this.roundMoney(
          taxiParkAverageRevenuePerOnlineDay,
        ),
        taxiParkAverageUtilizationRate: this.roundPercent(
          taxiParkAverageUtilizationRate,
        ),
        revenueDifferenceFromParkAverage: this.roundMoney(
          totalRevenue - taxiParkAverageRevenuePerCar,
        ),
        utilizationDifferenceFromParkAverage: this.roundPercent(
          utilizationRate - taxiParkAverageUtilizationRate,
        ),
      },
      brandAnalytics: {
        firm: currentBrandStat.firm,
        carsCount: currentBrandStat.carsCount,
        totalRevenue: this.roundMoney(currentBrandStat.totalRevenue),
        averageRevenuePerCar: this.roundMoney(currentBrandAverageRevenuePerCar),
        onlineDaysCount: currentBrandStat.onlineDaysCount,
        downtimeDaysCount: currentBrandStat.downtimeDaysCount,
        utilizationRate: this.roundPercent(
          this.safeDivide(
            currentBrandStat.onlineDaysCount * 100,
            currentBrandStat.carsCount * period.daysCount,
          ),
        ),
        rankByRevenue: currentBrandRank === 0 ? 1 : currentBrandRank,
        currentCarRevenueShare: this.roundPercent(
          this.safeDivide(totalRevenue * 100, currentBrandStat.totalRevenue),
        ),
        currentCarRevenueDifferenceFromBrandAverage: this.roundMoney(
          totalRevenue - currentBrandAverageRevenuePerCar,
        ),
      },
      charts: {
        revenueByDay: Array.from(revenueByDayMap.values()),
      },
      workDays: workDays.map((workDay) => ({
        workDayId: workDay.id,
        date: this.formatDate(workDay.workDate),
        revenue: this.roundMoney(Number(workDay.revenue)),
        carOnLine: workDay.carOnLine,
        driver: {
          driverId: workDay.driver.id,
          fullName: workDay.driver.user.fullName,
        },
      })),
    };
  }

  async getCarBrandsAnalytics(
    userId: string,
    taxiParkId: string,
    query: GetCarBrandsAnalyticsQueryDto,
  ): Promise<GetCarBrandsAnalyticsResponseDto> {
    const period = this.resolvePeriod(query);

    const taxiPark = await this.prisma.taxiPark.findUnique({
      where: { id: taxiParkId },
      include: {
        director: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!taxiPark) {
      throw new NotFoundException("Taxi park not found");
    }

    if (taxiPark.director.userId !== userId) {
      throw new ForbiddenException("Access to taxi park analytics is denied");
    }

    const [cars, workDays] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.prisma.workDay.findMany({
        where: {
          workDate: {
            gte: period.fromDate,
            lte: period.toDate,
          },
          driver: {
            taxiParkId,
          },
          car: {
            taxiParkId,
          },
        },
        include: {
          car: true,
          driver: true,
        },
        orderBy: {
          workDate: "asc",
        },
      }),
    ]);

    const brandStats = new Map<string, BrandStat>();

    for (const car of cars) {
      brandStats.set(car.firm, {
        firm: car.firm,
        carsCount: (brandStats.get(car.firm)?.carsCount ?? 0) + 1,
        totalRevenue: brandStats.get(car.firm)?.totalRevenue ?? 0,
        onlineDaysCount: brandStats.get(car.firm)?.onlineDaysCount ?? 0,
        downtimeDaysCount: brandStats.get(car.firm)?.downtimeDaysCount ?? 0,
      });
    }

    for (const workDay of workDays) {
      const brandStat = brandStats.get(workDay.car.firm);

      if (!brandStat) {
        continue;
      }

      brandStat.totalRevenue += Number(workDay.revenue);

      if (workDay.carOnLine) {
        brandStat.onlineDaysCount += 1;
      } else {
        brandStat.downtimeDaysCount += 1;
      }
    }

    const brands = Array.from(brandStats.values()).map((brandStat) => ({
      firm: brandStat.firm,
      carsCount: brandStat.carsCount,
      totalRevenue: this.roundMoney(brandStat.totalRevenue),
      averageRevenuePerCar: this.roundMoney(
        this.safeDivide(brandStat.totalRevenue, brandStat.carsCount),
      ),
      averageRevenuePerOnlineDay: this.roundMoney(
        this.safeDivide(brandStat.totalRevenue, brandStat.onlineDaysCount),
      ),
      onlineDaysCount: brandStat.onlineDaysCount,
      downtimeDaysCount: brandStat.downtimeDaysCount,
      utilizationRate: this.roundPercent(
        this.safeDivide(
          brandStat.onlineDaysCount * 100,
          brandStat.carsCount * period.daysCount,
        ),
      ),
      downtimeRate: this.roundPercent(
        this.safeDivide(
          brandStat.downtimeDaysCount * 100,
          brandStat.carsCount * period.daysCount,
        ),
      ),
      revenueRank: 0,
      downtimeRank: 0,
    }));

    const revenueRankedBrands = [...brands].sort((left, right) => {
      if (right.totalRevenue !== left.totalRevenue) {
        return right.totalRevenue - left.totalRevenue;
      }

      return left.firm.localeCompare(right.firm);
    });

    const revenueRankByFirm = new Map(
      revenueRankedBrands.map((brand, index) => [brand.firm, index + 1]),
    );

    const downtimeRankedBrands = [...brands].sort((left, right) => {
      if (right.downtimeDaysCount !== left.downtimeDaysCount) {
        return right.downtimeDaysCount - left.downtimeDaysCount;
      }

      if (right.downtimeRate !== left.downtimeRate) {
        return right.downtimeRate - left.downtimeRate;
      }

      return left.firm.localeCompare(right.firm);
    });

    const downtimeRankByFirm = new Map(
      downtimeRankedBrands.map((brand, index) => [brand.firm, index + 1]),
    );

    const rankedBrands = revenueRankedBrands.map((brand) => ({
      ...brand,
      revenueRank: revenueRankByFirm.get(brand.firm) ?? 0,
      downtimeRank: downtimeRankByFirm.get(brand.firm) ?? 0,
    }));

    const mostProfitableBrands = rankedBrands.slice(0, TOP_BRANDS_LIMIT).map((brand) => ({
      firm: brand.firm,
      carsCount: brand.carsCount,
      totalRevenue: brand.totalRevenue,
      averageRevenuePerCar: brand.averageRevenuePerCar,
      averageRevenuePerOnlineDay: brand.averageRevenuePerOnlineDay,
      onlineDaysCount: brand.onlineDaysCount,
      downtimeDaysCount: brand.downtimeDaysCount,
      utilizationRate: brand.utilizationRate,
      revenueRank: brand.revenueRank,
    }));

    const rankedBrandsByDowntime = [...rankedBrands].sort((left, right) => {
      if (right.downtimeDaysCount !== left.downtimeDaysCount) {
        return right.downtimeDaysCount - left.downtimeDaysCount;
      }

      if (right.downtimeRate !== left.downtimeRate) {
        return right.downtimeRate - left.downtimeRate;
      }

      return left.firm.localeCompare(right.firm);
    });

    const mostDowntimeBrands = rankedBrandsByDowntime
      .slice(0, TOP_BRANDS_LIMIT)
      .map((brand) => ({
        firm: brand.firm,
        carsCount: brand.carsCount,
        totalRevenue: brand.totalRevenue,
        onlineDaysCount: brand.onlineDaysCount,
        downtimeDaysCount: brand.downtimeDaysCount,
        downtimeRate: brand.downtimeRate,
        utilizationRate: brand.utilizationRate,
        downtimeRank: brand.downtimeRank,
      }));

    const totalRevenue = rankedBrands.reduce((sum, brand) => sum + brand.totalRevenue, 0);
    const totalDowntimeDaysCount = rankedBrands.reduce(
      (sum, brand) => sum + brand.downtimeDaysCount,
      0,
    );

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      taxiPark: {
        taxiParkId: taxiPark.id,
        name: taxiPark.name,
      },
      summary: {
        brandsCount: rankedBrands.length,
        carsCount: cars.length,
        totalRevenue: this.roundMoney(totalRevenue),
        totalDowntimeDaysCount,
        bestRevenueBrand: mostProfitableBrands[0]
          ? {
              firm: mostProfitableBrands[0].firm,
              totalRevenue: mostProfitableBrands[0].totalRevenue,
            }
          : null,
        mostDowntimeBrand: mostDowntimeBrands[0]
          ? {
              firm: mostDowntimeBrands[0].firm,
              downtimeDaysCount: mostDowntimeBrands[0].downtimeDaysCount,
            }
          : null,
      },
      brands: rankedBrands,
      mostProfitableBrands,
      mostDowntimeBrands,
    };
  }

  async getDriverAnalytics(
    userId: string,
    taxiParkId: string,
    driverId: string,
    query: GetDriverAnalyticsQueryDto,
  ): Promise<GetDriverAnalyticsResponseDto> {
    const period = this.resolvePeriod(query);

    const taxiPark = await this.prisma.taxiPark.findUnique({
      where: { id: taxiParkId },
      include: {
        director: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!taxiPark) {
      throw new NotFoundException("Taxi park not found");
    }

    if (taxiPark.director.userId !== userId) {
      throw new ForbiddenException("Access to taxi park analytics is denied");
    }

    const driver = await this.prisma.driver.findFirst({
      where: {
        id: driverId,
        taxiParkId,
      },
      include: {
        user: true,
        assignedCar: true,
      },
    });

    if (!driver) {
      throw new NotFoundException("Driver not found");
    }

    const [workDays, drivers, taxiParkWorkDays] = await Promise.all([
      this.prisma.workDay.findMany({
        where: {
          driverId,
          workDate: {
            gte: period.fromDate,
            lte: period.toDate,
          },
          driver: {
            taxiParkId,
          },
          car: {
            taxiParkId,
          },
        },
        include: {
          car: true,
        },
        orderBy: {
          workDate: "asc",
        },
      }),
      this.prisma.driver.findMany({
        where: {
          taxiParkId,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      this.getWorkDaysForTaxiParks(period, [taxiParkId]),
    ]);

    return this.buildDriverAnalytics(
      period,
      taxiParkId,
      taxiPark.name,
      driver,
      workDays,
      drivers,
      taxiParkWorkDays,
    );
  }

  async driverRevenue(
    userId: string,
    taxiParkId: string,
    driverId: string,
    query: GetTaxiParkAnalyticsQueryDto,
  ): Promise<DriverRevenueResponse> {
    const period = this.resolvePeriod(query);
    await this.getAllowedTaxiParkIds(userId, taxiParkId);

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver || driver.taxiParkId !== taxiParkId) {
      throw new NotFoundException("Driver not found");
    }

    const workDays = await this.prisma.workDay.findMany({
      where: {
        driverId,
        workDate: {
          gte: period.fromDate,
          lte: period.toDate,
        },
        driver: {
          taxiParkId,
        },
        car: {
          taxiParkId,
        },
      },
      orderBy: {
        workDate: "asc",
      },
    });

    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    const revenueByDay = workDays.map((workDay) => {
      const revenue = Number(workDay.revenue);
      totalRevenue += revenue;

      if (workDay.carOnLine) {
        onlineDaysCount += 1;
      } else {
        downtimeDaysCount += 1;
      }

      return {
        date: this.formatDate(workDay.workDate),
        revenue: this.roundMoney(revenue),
        carOnLine: workDay.carOnLine,
      };
    });

    const workDaysCount = workDays.length;

    return {
      driverId: driver.id,
      fullName: driver.user.fullName,
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
        averageRevenuePerOnlineDay: this.roundMoney(
          this.safeDivide(totalRevenue, onlineDaysCount),
        ),
        workDaysCount,
        onlineDaysCount,
        downtimeDaysCount,
        activityRate: this.roundPercent(
          this.safeDivide(onlineDaysCount * 100, period.daysCount),
        ),
        downtimeRate: this.roundPercent(
          this.safeDivide(downtimeDaysCount * 100, workDaysCount),
        ),
      },
      revenueByDay,
    };
  }

  async taxiParkRevenue(
    userId: string,
    taxiParkId: string,
    query: GetTaxiParkAnalyticsQueryDto,
  ): Promise<TaxiParkRevenueResponse> {
    const period = this.resolvePeriod(query);
    const { taxiParks } = await this.getAllowedTaxiParkIds(userId, taxiParkId);
    const taxiPark = taxiParks[0];

    const [cars, drivers, workDays] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.prisma.driver.findMany({
        where: { taxiParkId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.workDay.findMany({
        where: {
          workDate: {
            gte: period.fromDate,
            lte: period.toDate,
          },
          driver: {
            taxiParkId,
          },
          car: {
            taxiParkId,
          },
        },
        orderBy: {
          workDate: "asc",
        },
      }),
    ]);

    const revenueByDayMap = new Map(
      this.buildEmptyRevenueByDay(period).map((entry) => [entry.date, entry] as const),
    );
    const activeDriverIds = new Set<string>();
    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    for (const workDay of workDays) {
      const date = this.formatDate(workDay.workDate);
      const revenue = Number(workDay.revenue);
      const entry = revenueByDayMap.get(date);

      totalRevenue += revenue;
      activeDriverIds.add(workDay.driverId);

      if (entry) {
        entry.revenue += revenue;
        if (workDay.carOnLine) {
          entry.onlineCarsCount += 1;
        } else {
          entry.downtimeCarsCount += 1;
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

    return {
      taxiParkId: taxiPark.id,
      taxiParkName: taxiPark.name,
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
        averageRevenuePerCar: this.roundMoney(this.safeDivide(totalRevenue, cars.length)),
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
      revenueByDay: Array.from(revenueByDayMap.values()).map((entry) => ({
        ...entry,
        revenue: this.roundMoney(entry.revenue),
      })),
    };
  }

  async allRevenue(
    userId: string,
    query: GetTaxiParksAnalyticsQueryDto,
  ): Promise<AllRevenueResponse> {
    const period = this.resolvePeriod(query);
    const { taxiParks, taxiParkIds } = await this.getAllowedTaxiParkIds(userId);
    const revenueByDayMap = new Map(
      this.buildEmptyRevenueByDay(period).map((entry) => [entry.date, entry] as const),
    );
    const revenueByTaxiParkMap = new Map(
      taxiParks.map((taxiPark) => [
        taxiPark.id,
        {
          taxiParkId: taxiPark.id,
          taxiParkName: taxiPark.name,
          revenue: 0,
        },
      ]),
    );

    const workDays = await this.getWorkDaysForTaxiParks(period, taxiParkIds);

    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    for (const workDay of workDays) {
      const date = this.formatDate(workDay.workDate);
      const revenue = Number(workDay.revenue);
      const dayEntry = revenueByDayMap.get(date);
      const taxiParkEntry = revenueByTaxiParkMap.get(workDay.car.taxiParkId);

      totalRevenue += revenue;

      if (dayEntry) {
        dayEntry.revenue += revenue;
        if (workDay.carOnLine) {
          dayEntry.onlineCarsCount += 1;
        } else {
          dayEntry.downtimeCarsCount += 1;
        }
      }

      if (taxiParkEntry) {
        taxiParkEntry.revenue += revenue;
      }

      if (workDay.carOnLine) {
        onlineDaysCount += 1;
      } else {
        downtimeDaysCount += 1;
      }
    }

    const workDaysCount = workDays.length;
    const averageRevenuePerOnlineDay = this.safeDivide(totalRevenue, onlineDaysCount);

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      summary: {
        taxiParksCount: taxiParks.length,
        totalRevenue: this.roundMoney(totalRevenue),
        averageRevenuePerDay: this.roundMoney(
          this.safeDivide(totalRevenue, period.daysCount),
        ),
        averageRevenuePerTaxiPark: this.roundMoney(
          this.safeDivide(totalRevenue, taxiParks.length),
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
      revenueByTaxiPark: Array.from(revenueByTaxiParkMap.values())
        .sort((left, right) => {
          if (right.revenue !== left.revenue) {
            return right.revenue - left.revenue;
          }

          return left.taxiParkName.localeCompare(right.taxiParkName);
        })
        .map((entry) => ({
          ...entry,
          revenue: this.roundMoney(entry.revenue),
        })),
      revenueByDay: Array.from(revenueByDayMap.values()).map((entry) => ({
        ...entry,
        revenue: this.roundMoney(entry.revenue),
      })),
    };
  }

  async mostProfitableBrands(
    userId: string,
    query: GetTaxiParkAnalyticsQueryDto,
    taxiParkId?: string,
  ): Promise<BrandRevenueResponse[]> {
    const period = this.resolvePeriod(query);
    const { taxiParkIds } = await this.getAllowedTaxiParkIds(userId, taxiParkId);
    const [cars, workDays] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.getWorkDaysForTaxiParks(period, taxiParkIds),
    ]);

    const brandStats = new Map<string, BrandStat>();

    for (const car of cars) {
      brandStats.set(car.firm, {
        firm: car.firm,
        carsCount: (brandStats.get(car.firm)?.carsCount ?? 0) + 1,
        totalRevenue: brandStats.get(car.firm)?.totalRevenue ?? 0,
        onlineDaysCount: brandStats.get(car.firm)?.onlineDaysCount ?? 0,
        downtimeDaysCount: brandStats.get(car.firm)?.downtimeDaysCount ?? 0,
      });
    }

    for (const workDay of workDays) {
      const brandStat = brandStats.get(workDay.car.firm);

      if (!brandStat) {
        continue;
      }

      brandStat.totalRevenue += Number(workDay.revenue);
      if (workDay.carOnLine) {
        brandStat.onlineDaysCount += 1;
      } else {
        brandStat.downtimeDaysCount += 1;
      }
    }

    return Array.from(brandStats.values())
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }

        return left.firm.localeCompare(right.firm);
      })
      .slice(0, TOP_BRANDS_LIMIT)
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
  }

  async carsNotOnLine(
    userId: string,
    query: GetTaxiParkAnalyticsQueryDto,
    taxiParkId?: string,
  ): Promise<CarDowntimeResponse[]> {
    const period = this.resolvePeriod(query);
    const { taxiParks, taxiParkIds } = await this.getAllowedTaxiParkIds(userId, taxiParkId);
    const taxiParkNames = new Map(taxiParks.map((taxiPark) => [taxiPark.id, taxiPark.name]));

    const downtimeWorkDays = await this.prisma.workDay.findMany({
      where: {
        workDate: {
          gte: period.fromDate,
          lte: period.toDate,
        },
        carOnLine: false,
        driver: {
          taxiParkId: { in: taxiParkIds },
        },
        car: {
          taxiParkId: { in: taxiParkIds },
        },
      },
      include: {
        car: true,
      },
      orderBy: [{ workDate: "asc" }, { carId: "asc" }],
    });

    const grouped = new Map<string, CarDowntimeResponse>();

    for (const workDay of downtimeWorkDays) {
      const existing = grouped.get(workDay.carId);
      const date = this.formatDate(workDay.workDate);

      if (existing) {
        existing.downtimeDaysCount += 1;
        existing.dates.push(date);
        continue;
      }

      grouped.set(workDay.carId, {
        carId: workDay.car.id,
        firm: workDay.car.firm,
        model: workDay.car.model,
        plateNumber: workDay.car.plateNumber,
        state: workDay.car.state,
        taxiParkId: workDay.car.taxiParkId,
        taxiParkName: taxiParkNames.get(workDay.car.taxiParkId) ?? "",
        downtimeDaysCount: 1,
        dates: [date],
      });
    }

    return Array.from(grouped.values())
      .sort((left, right) => {
        if (right.downtimeDaysCount !== left.downtimeDaysCount) {
          return right.downtimeDaysCount - left.downtimeDaysCount;
        }

        return left.plateNumber.localeCompare(right.plateNumber);
      })
      .slice(0, TOP_RESULTS_LIMIT);
  }

  async mostBrokenBrands(
    userId: string,
    query: GetTaxiParkAnalyticsQueryDto,
    taxiParkId?: string,
  ): Promise<BrokenBrandResponse[]> {
    const period = this.resolvePeriod(query);
    const { taxiParkIds } = await this.getAllowedTaxiParkIds(userId, taxiParkId);
    const [cars, downtimeWorkDays] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
      }),
      this.prisma.workDay.findMany({
        where: {
          workDate: {
            gte: period.fromDate,
            lte: period.toDate,
          },
          carOnLine: false,
          driver: {
            taxiParkId: { in: taxiParkIds },
          },
          car: {
            taxiParkId: { in: taxiParkIds },
          },
        },
        include: {
          car: true,
        },
      }),
    ]);

    const brandStats = new Map<string, BrokenBrandResponse>();

    for (const car of cars) {
      brandStats.set(car.firm, {
        firm: car.firm,
        carsCount: (brandStats.get(car.firm)?.carsCount ?? 0) + 1,
        downtimeDaysCount: brandStats.get(car.firm)?.downtimeDaysCount ?? 0,
        downtimeRate: 0,
      });
    }

    for (const workDay of downtimeWorkDays) {
      const brandStat = brandStats.get(workDay.car.firm);
      if (brandStat) {
        brandStat.downtimeDaysCount += 1;
      }
    }

    return Array.from(brandStats.values())
      .map((brandStat) => ({
        ...brandStat,
        downtimeRate: this.roundPercent(
          this.safeDivide(
            brandStat.downtimeDaysCount * 100,
            brandStat.carsCount * period.daysCount,
          ),
        ),
      }))
      .sort((left, right) => {
        if (right.downtimeDaysCount !== left.downtimeDaysCount) {
          return right.downtimeDaysCount - left.downtimeDaysCount;
        }

        return left.firm.localeCompare(right.firm);
      })
      .slice(0, TOP_BRANDS_LIMIT);
  }

  async driversRating(
    userId: string,
    query: GetTaxiParkAnalyticsQueryDto,
    taxiParkId?: string,
  ): Promise<DriverRatingResponse[]> {
    const period = this.resolvePeriod(query);
    const { taxiParks, taxiParkIds } = await this.getAllowedTaxiParkIds(userId, taxiParkId);
    const taxiParkNames = new Map(taxiParks.map((taxiPark) => [taxiPark.id, taxiPark.name]));

    const [drivers, workDays] = await Promise.all([
      this.prisma.driver.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      this.getWorkDaysForTaxiParks(period, taxiParkIds),
    ]);

    const driverStats = new Map<string, Omit<DriverRatingResponse, "rank">>();

    for (const driver of drivers) {
      if (!driver.taxiParkId) {
        continue;
      }

      driverStats.set(driver.id, {
        driverId: driver.id,
        fullName: driver.user.fullName,
        taxiParkId: driver.taxiParkId,
        taxiParkName: taxiParkNames.get(driver.taxiParkId) ?? "",
        totalRevenue: 0,
        averageRevenuePerOnlineDay: 0,
        onlineDaysCount: 0,
        downtimeDaysCount: 0,
        activityRate: 0,
      });
    }

    for (const workDay of workDays) {
      const driverStat = driverStats.get(workDay.driverId);
      if (!driverStat) {
        continue;
      }

      driverStat.totalRevenue += Number(workDay.revenue);
      if (workDay.carOnLine) {
        driverStat.onlineDaysCount += 1;
      } else {
        driverStat.downtimeDaysCount += 1;
      }
    }

    return Array.from(driverStats.values())
      .filter(
        (driverStat) =>
          driverStat.totalRevenue > 0 ||
          driverStat.onlineDaysCount > 0 ||
          driverStat.downtimeDaysCount > 0,
      )
      .map((driverStat) => ({
        ...driverStat,
        totalRevenue: this.roundMoney(driverStat.totalRevenue),
        averageRevenuePerOnlineDay: this.roundMoney(
          this.safeDivide(driverStat.totalRevenue, driverStat.onlineDaysCount),
        ),
        activityRate: this.roundPercent(
          this.safeDivide(driverStat.onlineDaysCount * 100, period.daysCount),
        ),
      }))
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }

        return left.fullName.localeCompare(right.fullName);
      })
      .slice(0, TOP_RESULTS_LIMIT)
      .map((driverStat, index) => ({
        rank: index + 1,
        ...driverStat,
      }));
  }

  async downtimeLosses(
    userId: string,
    query: GetTaxiParkAnalyticsQueryDto,
    taxiParkId?: string,
  ): Promise<DowntimeLossesResponse> {
    const period = this.resolvePeriod(query);
    const { taxiParks, taxiParkIds } = await this.getAllowedTaxiParkIds(userId, taxiParkId);
    const taxiParkNames = new Map(taxiParks.map((taxiPark) => [taxiPark.id, taxiPark.name]));

    const [cars, workDays] = await Promise.all([
      this.prisma.car.findMany({
        where: { taxiParkId: { in: taxiParkIds } },
        orderBy: [{ firm: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
      }),
      this.getWorkDaysForTaxiParks(period, taxiParkIds),
    ]);

    const carStats = new Map(
      cars.map((car) => [
        car.id,
        {
          carId: car.id,
          firm: car.firm,
          model: car.model,
          plateNumber: car.plateNumber,
          taxiParkId: car.taxiParkId,
          taxiParkName: taxiParkNames.get(car.taxiParkId) ?? "",
          totalRevenue: 0,
          onlineDaysCount: 0,
          downtimeDaysCount: 0,
        },
      ]),
    );
    const lossesByDayMap = new Map<string, { date: string; downtimeCarsCount: number }>();

    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    for (const workDay of workDays) {
      const revenue = Number(workDay.revenue);
      const carStat = carStats.get(workDay.carId);

      totalRevenue += revenue;

      if (carStat) {
        carStat.totalRevenue += revenue;
      }

      if (workDay.carOnLine) {
        onlineDaysCount += 1;
        if (carStat) {
          carStat.onlineDaysCount += 1;
        }
      } else {
        downtimeDaysCount += 1;
        if (carStat) {
          carStat.downtimeDaysCount += 1;
        }

        const date = this.formatDate(workDay.workDate);
        const lossesByDayEntry = lossesByDayMap.get(date);
        if (lossesByDayEntry) {
          lossesByDayEntry.downtimeCarsCount += 1;
        } else {
          lossesByDayMap.set(date, {
            date,
            downtimeCarsCount: 1,
          });
        }
      }
    }

    const averageRevenuePerOnlineDay = this.safeDivide(totalRevenue, onlineDaysCount);

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      summary: {
        totalRevenue: this.roundMoney(totalRevenue),
        onlineDaysCount,
        downtimeDaysCount,
        averageRevenuePerOnlineDay: this.roundMoney(averageRevenuePerOnlineDay),
        estimatedDowntimeLoss: this.roundMoney(
          averageRevenuePerOnlineDay * downtimeDaysCount,
        ),
      },
      lossesByCar: Array.from(carStats.values())
        .filter((carStat) => carStat.downtimeDaysCount > 0)
        .map((carStat) => {
          const averageCarRevenuePerOnlineDay = this.safeDivide(
            carStat.totalRevenue,
            carStat.onlineDaysCount,
          );

          return {
            carId: carStat.carId,
            firm: carStat.firm,
            model: carStat.model,
            plateNumber: carStat.plateNumber,
            taxiParkId: carStat.taxiParkId,
            taxiParkName: carStat.taxiParkName,
            onlineDaysCount: carStat.onlineDaysCount,
            downtimeDaysCount: carStat.downtimeDaysCount,
            averageRevenuePerOnlineDay: this.roundMoney(averageCarRevenuePerOnlineDay),
            estimatedLoss: this.roundMoney(
              averageCarRevenuePerOnlineDay * carStat.downtimeDaysCount,
            ),
          };
        })
        .sort((left, right) => {
          if (right.estimatedLoss !== left.estimatedLoss) {
            return right.estimatedLoss - left.estimatedLoss;
          }

          return right.downtimeDaysCount - left.downtimeDaysCount;
        })
        .slice(0, TOP_RESULTS_LIMIT),
      lossesByDay: Array.from(lossesByDayMap.values())
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((entry) => ({
          date: entry.date,
          downtimeCarsCount: entry.downtimeCarsCount,
          estimatedLoss: this.roundMoney(
            averageRevenuePerOnlineDay * entry.downtimeCarsCount,
          ),
        })),
    };
  }

  private buildTaxiParkAnalytics(
    period: Period,
    drivers: DriverWithUser[],
    cars: Car[],
    workDays: WorkDayWithRelations[],
  ): GetTaxiParkAnalyticsResponseDto {
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
        // Brand utilization is normalized by all cars of that firm in the selected period.
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
        // If downtime counts are equal, the bigger modeled loss is shown first.
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
        averageRevenuePerCar: this.roundMoney(this.safeDivide(totalRevenue, cars.length)),
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

  private buildDriverAnalytics(
    period: Period,
    taxiParkId: string,
    taxiParkName: string,
    driver: DriverWithUserAndAssignedCar,
    workDays: DriverWorkDayWithCar[],
    drivers: DriverWithUser[],
    taxiParkWorkDays: WorkDayWithRelations[],
  ): GetDriverAnalyticsResponseDto {
    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    const revenueByDayMap = new Map<string, CarAnalyticsRevenueByDayEntry>();
    for (const date of this.getDateRange(period.from, period.to)) {
      revenueByDayMap.set(date, {
        date,
        revenue: 0,
        carOnLine: false,
      });
    }

    for (const workDay of workDays) {
      const date = this.formatDate(workDay.workDate);
      const revenue = Number(workDay.revenue);

      totalRevenue += revenue;

      if (workDay.carOnLine) {
        onlineDaysCount += 1;
      } else {
        downtimeDaysCount += 1;
      }

      revenueByDayMap.set(date, {
        date,
        revenue: this.roundMoney(revenue),
        carOnLine: workDay.carOnLine,
      });
    }

    const workDaysCount = workDays.length;
    const averageRevenuePerShift = this.safeDivide(totalRevenue, onlineDaysCount);
    const averageRevenuePerDay = this.safeDivide(totalRevenue, period.daysCount);
    const activityRate = this.safeDivide(onlineDaysCount * 100, period.daysCount);
    const downtimeRate = this.safeDivide(downtimeDaysCount * 100, workDaysCount);

    const driverStats = new Map(
      drivers.map((taxiParkDriver) => [
        taxiParkDriver.id,
        {
          totalRevenue: 0,
          onlineDaysCount: 0,
        },
      ]),
    );
    let taxiParkTotalRevenue = 0;
    let taxiParkOnlineDaysCount = 0;
    const activeDriverIds = new Set<string>();

    for (const workDay of taxiParkWorkDays) {
      const revenue = Number(workDay.revenue);
      const driverStat = driverStats.get(workDay.driverId);

      taxiParkTotalRevenue += revenue;
      activeDriverIds.add(workDay.driverId);

      if (workDay.carOnLine) {
        taxiParkOnlineDaysCount += 1;
      }

      if (!driverStat) {
        continue;
      }

      driverStat.totalRevenue += revenue;
      if (workDay.carOnLine) {
        driverStat.onlineDaysCount += 1;
      }
    }

    const rankedDrivers = drivers
      .map((taxiParkDriver) => ({
        driverId: taxiParkDriver.id,
        fullName: taxiParkDriver.user.fullName,
        totalRevenue: driverStats.get(taxiParkDriver.id)?.totalRevenue ?? 0,
      }))
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }

        return left.fullName.localeCompare(right.fullName);
      });

    const rank = rankedDrivers.findIndex((entry) => entry.driverId === driver.id) + 1;
    const driversCount = drivers.length;
    const activeDriversCount = activeDriverIds.size;
    const taxiParkAverageRevenuePerDriver = this.safeDivide(
      taxiParkTotalRevenue,
      activeDriversCount,
    );
    const taxiParkAverageRevenuePerShift = this.safeDivide(
      taxiParkTotalRevenue,
      taxiParkOnlineDaysCount,
    );
    const taxiParkAverageActivityRate = this.safeDivide(
      taxiParkOnlineDaysCount * 100,
      driversCount * period.daysCount,
    );
    const revenueDifferenceFromParkAverage =
      totalRevenue - taxiParkAverageRevenuePerDriver;
    const shiftRevenueDifferenceFromParkAverage =
      averageRevenuePerShift - taxiParkAverageRevenuePerShift;
    const activityDifferenceFromParkAverage =
      activityRate - taxiParkAverageActivityRate;

    const maxDriverRevenue = rankedDrivers.reduce(
      (maxRevenue, entry) => Math.max(maxRevenue, entry.totalRevenue),
      0,
    );
    const averageDailyRevenueForDriver = this.safeDivide(totalRevenue, onlineDaysCount);
    const daysWithRevenueAboveAverage = workDays.filter(
      (workDay) =>
        workDay.carOnLine && Number(workDay.revenue) > averageDailyRevenueForDriver,
    ).length;
    const revenueScore = this.safeDivide(totalRevenue * 100, maxDriverRevenue);
    const activityScore = this.safeDivide(onlineDaysCount * 100, period.daysCount);
    const stabilityScore = this.safeDivide(
      daysWithRevenueAboveAverage * 100,
      onlineDaysCount,
    );
    const driverEfficiency =
      revenueScore * 0.6 + activityScore * 0.3 + stabilityScore * 0.1;

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      driver: {
        driverId: driver.id,
        fullName: driver.user.fullName,
        taxiParkId,
        taxiParkName,
        assignedCar: driver.assignedCar
          ? {
              carId: driver.assignedCar.id,
              firm: driver.assignedCar.firm,
              model: driver.assignedCar.model,
              plateNumber: driver.assignedCar.plateNumber,
              state: driver.assignedCar.state,
            }
          : null,
      },
      summary: {
        totalRevenue: this.roundMoney(totalRevenue),
        averageRevenuePerShift: this.roundMoney(averageRevenuePerShift),
        averageRevenuePerDay: this.roundMoney(averageRevenuePerDay),
        workDaysCount,
        onlineDaysCount,
        downtimeDaysCount,
        activityRate: this.roundPercent(activityRate),
        downtimeRate: this.roundPercent(downtimeRate),
        revenueDifferenceFromParkAverage: this.roundMoney(
          revenueDifferenceFromParkAverage,
        ),
      },
      scorecard: {
        driverEfficiency: this.roundPercent(driverEfficiency),
        revenueScore: this.roundPercent(revenueScore),
        activityScore: this.roundPercent(activityScore),
        stabilityScore: this.roundPercent(stabilityScore),
        maxDriverRevenue: this.roundMoney(maxDriverRevenue),
        daysWithRevenueAboveAverage,
      },
      rating: {
        rank: rank === 0 ? 1 : rank,
        driversCount,
      },
      comparison: {
        taxiParkAverageRevenuePerDriver: this.roundMoney(
          taxiParkAverageRevenuePerDriver,
        ),
        taxiParkAverageRevenuePerShift: this.roundMoney(
          taxiParkAverageRevenuePerShift,
        ),
        taxiParkAverageActivityRate: this.roundPercent(taxiParkAverageActivityRate),
        revenueDifferenceFromParkAverage: this.roundMoney(
          revenueDifferenceFromParkAverage,
        ),
        shiftRevenueDifferenceFromParkAverage: this.roundMoney(
          shiftRevenueDifferenceFromParkAverage,
        ),
        activityDifferenceFromParkAverage: this.roundPercent(
          activityDifferenceFromParkAverage,
        ),
      },
      charts: {
        revenueByDay: Array.from(revenueByDayMap.values()),
      },
      workDays: workDays.map((workDay) => ({
        workDayId: workDay.id,
        date: this.formatDate(workDay.workDate),
        revenue: this.roundMoney(Number(workDay.revenue)),
        carOnLine: workDay.carOnLine,
        car: {
          carId: workDay.car.id,
          firm: workDay.car.firm,
          model: workDay.car.model,
          plateNumber: workDay.car.plateNumber,
        },
      })),
    };
  }

  private buildDirectorDashboard(
    period: Period,
    taxiParks: TaxiParkAccess["taxiParks"],
    cars: Car[],
    drivers: DriverWithUserAndAssignedCar[],
    workDays: WorkDayWithRelations[],
  ): GetDirectorDashboardResponseDto {
    const taxiParksById = new Map(taxiParks.map((item) => [item.id, item] as const));
    const taxiParkAggregates = new Map(
      taxiParks.map((taxiPark) => [
        taxiPark.id,
        {
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
        },
      ]),
    );
    const revenueByDayMap = new Map(
      this.buildEmptyRevenueByDay(period).map((entry) => [entry.date, entry] as const),
    );
    const driverStats = new Map<
      string,
      DriverStat & {
        taxiParkId: string;
        taxiParkName: string;
        daysWithRevenueAboveAverage: number;
      }
    >();
    const carStats = new Map<
      string,
      CarStat & {
        taxiParkId: string;
        taxiParkName: string;
      }
    >();
    const brandStats = new Map<string, BrandStat>();
    const activeDriverIds = new Set<string>();
    const activeDriverIdsByParkId = new Map<string, Set<string>>();

    for (const taxiPark of taxiParks) {
      activeDriverIdsByParkId.set(taxiPark.id, new Set<string>());
    }

    for (const driver of drivers) {
      if (!driver.taxiParkId) {
        continue;
      }

      const driverTaxiParkAggregate = taxiParkAggregates.get(driver.taxiParkId);
      if (driverTaxiParkAggregate) {
        driverTaxiParkAggregate.driversCount += 1;
      }

      driverStats.set(driver.id, {
        driverId: driver.id,
        fullName: driver.user.fullName,
        taxiParkId: driver.taxiParkId,
        taxiParkName: taxiParksById.get(driver.taxiParkId)?.name ?? "",
        totalRevenue: 0,
        onlineDaysCount: 0,
        downtimeDaysCount: 0,
        daysWithRevenueAboveAverage: 0,
      });
    }

    for (const car of cars) {
      const carTaxiParkAggregate = taxiParkAggregates.get(car.taxiParkId);
      if (carTaxiParkAggregate) {
        carTaxiParkAggregate.carsCount += 1;
      }

      carStats.set(car.id, {
        carId: car.id,
        firm: car.firm,
        model: car.model,
        plateNumber: car.plateNumber,
        state: car.state,
        taxiParkId: car.taxiParkId,
        taxiParkName: taxiParksById.get(car.taxiParkId)?.name ?? "",
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

    let totalRevenue = 0;
    let onlineDaysCount = 0;
    let downtimeDaysCount = 0;

    for (const workDay of workDays) {
      const driverTaxiParkId = workDay.driver.taxiParkId;
      const carTaxiParkId = workDay.car.taxiParkId;

      if (!driverTaxiParkId || driverTaxiParkId !== carTaxiParkId) {
        continue;
      }

      const aggregate = taxiParkAggregates.get(driverTaxiParkId);
      const date = this.formatDate(workDay.workDate);
      const revenue = Number(workDay.revenue);
      const dayEntry = revenueByDayMap.get(date);

      totalRevenue += revenue;
      activeDriverIds.add(workDay.driverId);
      activeDriverIdsByParkId.get(driverTaxiParkId)?.add(workDay.driverId);

      if (aggregate) {
        aggregate.totalRevenue += revenue;
        aggregate.workDaysCount += 1;
      }

      if (dayEntry) {
        dayEntry.revenue += revenue;
        if (workDay.carOnLine) {
          dayEntry.onlineCarsCount += 1;
        } else {
          dayEntry.downtimeCarsCount += 1;
        }
      }

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
        aggregate && (aggregate.onlineDaysCount += 1);
      } else {
        downtimeDaysCount += 1;
        aggregate && (aggregate.downtimeDaysCount += 1);
      }
    }

    for (const workDay of workDays) {
      if (!workDay.carOnLine) {
        continue;
      }

      const driverStat = driverStats.get(workDay.driverId);
      if (!driverStat) {
        continue;
      }

      const driverAverageRevenuePerShift = this.safeDivide(
        driverStat.totalRevenue,
        driverStat.onlineDaysCount,
      );

      if (Number(workDay.revenue) > driverAverageRevenuePerShift) {
        driverStat.daysWithRevenueAboveAverage += 1;
      }
    }

    for (const [taxiParkId, aggregate] of taxiParkAggregates) {
      aggregate.activeDriversCount = activeDriverIdsByParkId.get(taxiParkId)?.size ?? 0;
    }

    const workDaysCount = workDays.length;
    const averageRevenuePerOnlineDay = this.safeDivide(totalRevenue, onlineDaysCount);
    const averageRevenuePerActiveDriver = this.safeDivide(
      totalRevenue,
      activeDriverIds.size,
    );

    const taxiParksComparison = Array.from(taxiParkAggregates.values())
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }

        return left.name.localeCompare(right.name);
      })
      .map((aggregate) => ({
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
          this.safeDivide(aggregate.totalRevenue, aggregate.onlineDaysCount) *
            aggregate.downtimeDaysCount,
        ),
      }));

    const revenueByDay = Array.from(revenueByDayMap.values()).map((entry) => ({
      ...entry,
      revenue: this.roundMoney(entry.revenue),
    }));

    const revenueByTaxiPark = taxiParksComparison.map((taxiPark) => ({
      taxiParkId: taxiPark.taxiParkId,
      taxiParkName: taxiPark.name,
      revenue: taxiPark.totalRevenue,
    }));

    const rankedDrivers = Array.from(driverStats.values()).sort((left, right) => {
      if (right.totalRevenue !== left.totalRevenue) {
        return right.totalRevenue - left.totalRevenue;
      }

      return left.fullName.localeCompare(right.fullName);
    });
    const maxDriverRevenue = rankedDrivers.reduce(
      (maxRevenue, item) => Math.max(maxRevenue, item.totalRevenue),
      0,
    );

    const driversRating = rankedDrivers.map((driverStat, index) => ({
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

    const topDrivers = driversRating.slice(0, DIRECTOR_DASHBOARD_TOP_LIMIT);
    const belowAverageDrivers = driversRating
      .filter((driverStat) => driverStat.totalRevenue < averageRevenuePerActiveDriver)
      .sort((left, right) => {
        if (left.totalRevenue !== right.totalRevenue) {
          return left.totalRevenue - right.totalRevenue;
        }

        return left.fullName.localeCompare(right.fullName);
      })
      .slice(0, DIRECTOR_DASHBOARD_TOP_LIMIT);

    const driverEfficiency = rankedDrivers
      .map((driverStat) => {
        const revenueScore = this.safeDivide(
          driverStat.totalRevenue * 100,
          maxDriverRevenue,
        );
        const activityScore = this.safeDivide(
          driverStat.onlineDaysCount * 100,
          period.daysCount,
        );
        const stabilityScore = this.safeDivide(
          driverStat.daysWithRevenueAboveAverage * 100,
          driverStat.onlineDaysCount,
        );
        const efficiency = revenueScore * 0.6 + activityScore * 0.3 + stabilityScore * 0.1;

        return {
          driverId: driverStat.driverId,
          fullName: driverStat.fullName,
          taxiParkId: driverStat.taxiParkId,
          taxiParkName: driverStat.taxiParkName,
          driverEfficiency: this.roundPercent(efficiency),
          revenueScore: this.roundPercent(revenueScore),
          activityScore: this.roundPercent(activityScore),
          stabilityScore: this.roundPercent(stabilityScore),
          totalRevenue: this.roundMoney(driverStat.totalRevenue),
          maxDriverRevenue: this.roundMoney(maxDriverRevenue),
          daysWithRevenueAboveAverage: driverStat.daysWithRevenueAboveAverage,
        };
      })
      .sort((left, right) => {
        if (right.driverEfficiency !== left.driverEfficiency) {
          return right.driverEfficiency - left.driverEfficiency;
        }

        return left.fullName.localeCompare(right.fullName);
      })
      .slice(0, DIRECTOR_DASHBOARD_TOP_LIMIT);

    const rankedCars = Array.from(carStats.values()).sort((left, right) => {
      if (right.totalRevenue !== left.totalRevenue) {
        return right.totalRevenue - left.totalRevenue;
      }

      return left.plateNumber.localeCompare(right.plateNumber);
    });

    const topCars = rankedCars
      .slice(0, DIRECTOR_DASHBOARD_TOP_LIMIT)
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

    const utilization = Array.from(carStats.values())
      .sort((left, right) => {
        const rightUtilization = this.safeDivide(right.onlineDaysCount * 100, period.daysCount);
        const leftUtilization = this.safeDivide(left.onlineDaysCount * 100, period.daysCount);

        if (rightUtilization !== leftUtilization) {
          return rightUtilization - leftUtilization;
        }

        return left.plateNumber.localeCompare(right.plateNumber);
      })
      .slice(0, DIRECTOR_DASHBOARD_TOP_LIMIT)
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
      .slice(0, DIRECTOR_DASHBOARD_TOP_LIMIT)
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

    const topBrands = Array.from(brandStats.values())
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }

        return left.firm.localeCompare(right.firm);
      })
      .slice(0, DIRECTOR_DASHBOARD_TOP_LIMIT)
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

    return {
      period: {
        from: period.from,
        to: period.to,
        daysCount: period.daysCount,
      },
      summary: {
        taxiParksCount: taxiParks.length,
        driversCount: drivers.length,
        activeDriversCount: activeDriverIds.size,
        carsCount: cars.length,
        workDaysCount,
        onlineDaysCount,
        downtimeDaysCount,
      },
      financialKpis: {
        totalRevenue: this.roundMoney(totalRevenue),
        averageRevenuePerDay: this.roundMoney(
          this.safeDivide(totalRevenue, period.daysCount),
        ),
        averageRevenuePerActiveDriver: this.roundMoney(averageRevenuePerActiveDriver),
        averageRevenuePerCar: this.roundMoney(this.safeDivide(totalRevenue, cars.length)),
        averageRevenuePerTaxiPark: this.roundMoney(
          this.safeDivide(totalRevenue, taxiParks.length),
        ),
      },
      downtimeKpis: {
        downtimeDaysCount,
        downtimeRate: this.roundPercent(
          this.safeDivide(downtimeDaysCount * 100, workDaysCount),
        ),
        onlineDaysCount,
        onlineRate: this.roundPercent(this.safeDivide(onlineDaysCount * 100, workDaysCount)),
        estimatedDowntimeLoss: this.roundMoney(
          averageRevenuePerOnlineDay * downtimeDaysCount,
        ),
        mostDowntimeCars: problemCars,
      },
      driverKpis: {
        topDrivers,
        belowAverageDrivers,
        driversRating: driversRating.slice(0, TOP_RESULTS_LIMIT),
        driverEfficiency,
      },
      carKpis: {
        topCars,
        problemCars,
        utilization,
        topBrands,
      },
      charts: {
        revenueByDay,
        downtimeByDay: revenueByDay.map((entry) => ({
          date: entry.date,
          downtimeCarsCount: entry.downtimeCarsCount,
        })),
        revenueByTaxiPark,
      },
      taxiParks: taxiParksComparison,
    };
  }

  private async getAllowedTaxiParkIds(
    userId: string,
    taxiParkId?: string,
  ): Promise<TaxiParkAccess> {
    if (taxiParkId) {
      const taxiPark = await this.prisma.taxiPark.findUnique({
        where: { id: taxiParkId },
        select: {
          id: true,
          name: true,
          address: true,
          director: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!taxiPark) {
        throw new NotFoundException("Taxi park not found");
      }

      if (taxiPark.director.userId !== userId) {
        throw new ForbiddenException("Access to taxi park analytics is denied");
      }

      return {
        taxiParks: [
          {
            id: taxiPark.id,
            name: taxiPark.name,
            address: taxiPark.address,
          },
        ],
        taxiParkIds: [taxiPark.id],
      };
    }

    const director = await this.prisma.director.findUnique({
      where: { userId },
    });

    if (!director) {
      throw new ForbiddenException("Only director allowed");
    }

    const taxiParks = await this.prisma.taxiPark.findMany({
      where: { directorId: director.id },
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      taxiParks,
      taxiParkIds: taxiParks.map((taxiPark) => taxiPark.id),
    };
  }

  private async getWorkDaysForTaxiParks(
    period: Period,
    taxiParkIds: string[],
  ): Promise<WorkDayWithRelations[]> {
    if (taxiParkIds.length === 0) {
      return [];
    }

    return this.prisma.workDay.findMany({
      where: {
        workDate: {
          gte: period.fromDate,
          lte: period.toDate,
        },
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
  }

  private buildEmptyRevenueByDay(period: Period): RevenueByDayEntry[] {
    return this.getDateRange(period.from, period.to).map((date) => ({
      date,
      revenue: 0,
      onlineCarsCount: 0,
      downtimeCarsCount: 0,
    }));
  }

  private async assertUserRole(userId: string, role: UserRole): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== role) {
      throw new ForbiddenException(`Only ${role.toLowerCase()} allowed`);
    }
  }

  private resolvePeriod(query: AnalyticsPeriodQueryDto): Period {
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

  private safeDivide(dividend: number, divisor: number): number {
    if (divisor === 0) {
      return 0;
    }

    return dividend / divisor;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundPercent(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
