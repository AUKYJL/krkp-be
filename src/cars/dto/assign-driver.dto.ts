import { ApiProperty } from "@nestjs/swagger";
import { registerDecorator, ValidationOptions } from "class-validator";

function IsNullableStringProperty(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isNullableStringProperty",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return value !== undefined && (value === null || typeof value === "string");
        },
      },
    });
  };
}

export class AssignDriverDto {
  @ApiProperty({ example: "driver-uuid", nullable: true })
  @IsNullableStringProperty({
    message: "driverId must be a string or null",
  })
  driverId: string | null;
}
