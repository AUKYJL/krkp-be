-- CreateIndex
CREATE INDEX "Driver_taxiParkId_idx" ON "Driver"("taxiParkId");

-- CreateIndex
CREATE INDEX "Car_taxiParkId_idx" ON "Car"("taxiParkId");

-- CreateIndex
CREATE INDEX "Car_firm_idx" ON "Car"("firm");

-- CreateIndex
CREATE INDEX "WorkDay_driverId_workDate_idx" ON "WorkDay"("driverId", "workDate");

-- CreateIndex
CREATE INDEX "WorkDay_carId_workDate_idx" ON "WorkDay"("carId", "workDate");
