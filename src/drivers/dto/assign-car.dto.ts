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

export class AssignCarDto {
  @ApiProperty({ example: "car-uuid", nullable: true })
  @IsNullableStringProperty({
    message: "carId must be a string or null",
  })
  carId: string | null;
}
