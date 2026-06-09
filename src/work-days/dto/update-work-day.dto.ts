import { PartialType } from "@nestjs/swagger";
import { CreateWorkDayDto } from "./create-work-day.dto";

export class UpdateWorkDayDto extends PartialType(CreateWorkDayDto) {}
