import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Skeleton only. TODO: implement real analytics queries.
  async driverRevenue() {
    return { total: 0 };
  }

  async taxiParkRevenue() {
    return { total: 0 };
  }

  async allRevenue() {
    return { total: 0 };
  }

  async mostProfitableBrands() {
    return [];
  }

  async carsNotOnLine() {
    return [];
  }

  async mostBrokenBrands() {
    return [];
  }

  async driversRating() {
    return [];
  }

  async downtimeLosses() {
    return { total: 0 };
  }
}

