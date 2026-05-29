import { PartialType } from "@nestjs/swagger";
import { CreateTaxiParkDto } from "./create-taxi-park.dto";

export class UpdateTaxiParkDto extends PartialType(CreateTaxiParkDto) {}

