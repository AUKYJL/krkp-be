import { validateSync } from "class-validator";
import { AssignDriverDto } from "./assign-driver.dto";

describe("AssignDriverDto", () => {
  it("accepts a string driverId", () => {
    const errors = validateSync(Object.assign(new AssignDriverDto(), { driverId: "driver-1" }));
    expect(errors).toHaveLength(0);
  });

  it("accepts null driverId", () => {
    const errors = validateSync(Object.assign(new AssignDriverDto(), { driverId: null }));
    expect(errors).toHaveLength(0);
  });

  it("rejects missing driverId", () => {
    const errors = validateSync(new AssignDriverDto());
    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toHaveProperty("isNullableStringProperty");
  });
});
