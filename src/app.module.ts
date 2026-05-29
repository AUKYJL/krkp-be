import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { JwtGlobalModule } from "./jwt/jwt.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaService } from "./prisma/prisma.service";
import { UserModule } from "./user/user.module";
import { ActionLogsModule } from "./action-logs/action-logs.module";
import { TaxiParksModule } from "./taxi-parks/taxi-parks.module";
import { CarsModule } from "./cars/cars.module";
import { DriversModule } from "./drivers/drivers.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { WorkDaysModule } from "./work-days/work-days.module";
import { AnalyticsModule } from "./analytics/analytics.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtGlobalModule,

    PrismaModule,
    UserModule,
    AuthModule,
    ActionLogsModule,
    TaxiParksModule,
    CarsModule,
    DriversModule,
    InvitationsModule,
    WorkDaysModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
