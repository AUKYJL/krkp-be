import { validateSync } from "class-validator";
import { AssignCarDto } from "./assign-car.dto";

describe("AssignCarDto", () => {
  it("accepts a string carId", () => {
    const errors = validateSync(Object.assign(new AssignCarDto(), { carId: "car-1" }));
    expect(errors).toHaveLength(0);
  });

  it("accepts null carId", () => {
    const errors = validateSync(Object.assign(new AssignCarDto(), { carId: null }));
    expect(errors).toHaveLength(0);
  });

  it("rejects missing carId", () => {
    const errors = validateSync(new AssignCarDto());
    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toHaveProperty("isNullableStringProperty");
  });
});
