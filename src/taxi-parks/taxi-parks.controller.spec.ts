import "reflect-metadata";
import { ROLES_KEY } from "../auth/decorators/roles.decorator";
import { ROLE } from "../shared/types/roles";
import { TaxiParksController } from "./taxi-parks.controller";

describe("TaxiParksController roles metadata", () => {
  it("allows director and driver to access getCarAnalytics", () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      TaxiParksController.prototype.getCarAnalytics,
    );

    expect(roles).toEqual([ROLE.DIRECTOR, ROLE.DRIVER]);
  });
});
