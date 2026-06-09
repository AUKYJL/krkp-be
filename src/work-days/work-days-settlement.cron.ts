import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { WorkDaysSettlementService } from "./work-days-settlement.service";

@Injectable()
export class WorkDaysSettlementCron {
  constructor(private readonly settlementService: WorkDaysSettlementService) {}

  @Cron("0 55 23 * * *", { timeZone: "Europe/Moscow" })
  async settleCurrentBusinessDay() {
    await this.settlementService.settleCurrentBusinessDay();
  }
}
