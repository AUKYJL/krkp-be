import "dotenv/config";
import {
  CarState,
  InvitationStatus,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { randomBytes, randomUUID, scryptSync } from "crypto";

const prisma = new PrismaClient();
let actionLogMetadataColumnExists: boolean | undefined;

type DemoUser = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  passportNumber?: string;
  experience?: number;
};

type DemoTaxiPark = {
  name: string;
  address: string;
};

type DemoCar = {
  firm: string;
  model: string;
  type: string;
  plateNumber: string;
  state: CarState;
  taxiParkId: string;
};

type DemoWorkDay = {
  driverId: string;
  carId: string;
  workDate: Date;
  revenue: number;
  carOnLine: boolean;
};

type DemoActionLog = {
  userId: string;
  action: string;
  description: string;
  taxiParkId?: string;
  metadata?: Prisma.InputJsonObject;
};

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}.${derivedKey.toString("hex")}`;
}

async function hasActionLogMetadataColumn() {
  if (actionLogMetadataColumnExists !== undefined) {
    return actionLogMetadataColumnExists;
  }

  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ActionLog'
        AND column_name = 'metadata'
    ) AS "exists"
  `;

  actionLogMetadataColumnExists = Boolean(result[0]?.exists);
  return actionLogMetadataColumnExists;
}

async function ensureUser(input: DemoUser) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      passwordHash: hashPassword(input.password),
      role: input.role,
    },
    create: {
      fullName: input.fullName,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
    },
  });

  if (input.role === UserRole.DIRECTOR) {
    await prisma.director.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  if (input.role === UserRole.DRIVER) {
    await prisma.driver.upsert({
      where: { userId: user.id },
      update: {
        passportNumber: input.passportNumber ?? "",
        experience: input.experience ?? 0,
      },
      create: {
        userId: user.id,
        passportNumber: input.passportNumber ?? "",
        experience: input.experience ?? 0,
      },
    });
  }

  return user;
}

async function ensureTaxiPark(directorId: string, input: DemoTaxiPark) {
  const existing = await prisma.taxiPark.findFirst({
    where: { directorId, name: input.name },
    select: { id: true },
  });

  if (existing) {
    return prisma.taxiPark.update({
      where: { id: existing.id },
      data: { address: input.address },
    });
  }

  return prisma.taxiPark.create({
    data: {
      directorId,
      name: input.name,
      address: input.address,
    },
  });
}

async function ensureCar(input: DemoCar) {
  return prisma.car.upsert({
    where: { plateNumber: input.plateNumber },
    update: {
      firm: input.firm,
      model: input.model,
      type: input.type,
      state: input.state,
      taxiParkId: input.taxiParkId,
    },
    create: input,
  });
}

async function ensureInvitation(
  taxiParkId: string,
  driverId: string,
  status: InvitationStatus,
) {
  return prisma.driverInvitation.upsert({
    where: {
      taxiParkId_driverId: {
        taxiParkId,
        driverId,
      },
    },
    update: { status },
    create: { taxiParkId, driverId, status },
  });
}

async function ensureWorkDay(input: DemoWorkDay) {
  const existing = await prisma.workDay.findFirst({
    where: {
      driverId: input.driverId,
      workDate: input.workDate,
    },
    select: { id: true },
  });

  const payload = {
    driverId: input.driverId,
    carId: input.carId,
    workDate: input.workDate,
    revenue: new Prisma.Decimal(input.revenue),
    carOnLine: input.carOnLine,
  };

  if (existing) {
    return prisma.workDay.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.workDay.create({ data: payload });
}

async function ensureActionLog(input: DemoActionLog) {
  const hasMetadataColumn = await hasActionLogMetadataColumn();

  if (!hasMetadataColumn) {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ActionLog"
      WHERE "userId" = ${input.userId}
        AND "action" = ${input.action}
        AND "description" = ${input.description}
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;

    if (existing[0]?.id) {
      await prisma.$executeRaw`
        UPDATE "ActionLog"
        SET "taxiParkId" = ${input.taxiParkId ?? null}
        WHERE "id" = ${existing[0].id}
      `;
      return { id: existing[0].id };
    }

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "ActionLog" ("id", "userId", "taxiParkId", "action", "description", "createdAt")
      VALUES (
        ${id},
        ${input.userId},
        ${input.taxiParkId ?? null},
        ${input.action},
        ${input.description},
        NOW()
      )
    `;
    return { id };
  }

  const existing = await prisma.actionLog.findFirst({
    where: {
      userId: input.userId,
      action: input.action,
      description: input.description,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.actionLog.update({
      where: { id: existing.id },
      data: {
        taxiParkId: input.taxiParkId ?? null,
        metadata: input.metadata,
      },
    });
  }

  return prisma.actionLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      description: input.description,
      taxiParkId: input.taxiParkId,
      metadata: input.metadata,
    },
  });
}

async function main() {
  const directorUser = await ensureUser({
    fullName: "Demo Director",
    email: "admin@gmail.com",
    password: "adminadmin",
    role: UserRole.DIRECTOR,
  });

  const driverUser = await ensureUser({
    fullName: "Artem Loginov",
    email: "admin1@gmail.com",
    password: "admin1admin1",
    role: UserRole.DRIVER,
    passportNumber: "4012 556781",
    experience: 6,
  });

  const extraDriverUsers = await Promise.all([
    ensureUser({
      fullName: "Pavel Petrov",
      email: "driver.petrov@gmail.com",
      password: "petrov123",
      role: UserRole.DRIVER,
      passportNumber: "4013 112233",
      experience: 9,
    }),
    ensureUser({
      fullName: "Nikita Sidorov",
      email: "driver.sidorov@gmail.com",
      password: "sidorov123",
      role: UserRole.DRIVER,
      passportNumber: "4014 223344",
      experience: 4,
    }),
    ensureUser({
      fullName: "Ivan Smirnov",
      email: "driver.smirnov@gmail.com",
      password: "smirnov123",
      role: UserRole.DRIVER,
      passportNumber: "4015 334455",
      experience: 2,
    }),
  ]);

  const director = await prisma.director.findUniqueOrThrow({
    where: { userId: directorUser.id },
  });

  const [mainDriver, parkTwoDriver, rejectedDriver, pendingDriver] =
    await Promise.all([
      prisma.driver.findUniqueOrThrow({ where: { userId: driverUser.id } }),
      prisma.driver.findUniqueOrThrow({
        where: { userId: extraDriverUsers[0].id },
      }),
      prisma.driver.findUniqueOrThrow({
        where: { userId: extraDriverUsers[1].id },
      }),
      prisma.driver.findUniqueOrThrow({
        where: { userId: extraDriverUsers[2].id },
      }),
    ]);

  const [northPark, southPark, airportPark] = await Promise.all([
    ensureTaxiPark(director.id, {
      name: "North Fleet",
      address: "Moscow, Leningradsky Ave, 39",
    }),
    ensureTaxiPark(director.id, {
      name: "South Fleet",
      address: "Moscow, Varshavskoye Hwy, 118",
    }),
    ensureTaxiPark(director.id, {
      name: "Airport Fleet",
      address: "Khimki, Sheremetyevo Terminal B",
    }),
  ]);

  const [camry, rio, solaris, octavia, polo] = await Promise.all([
    ensureCar({
      firm: "Toyota",
      model: "Camry",
      type: "Sedan",
      plateNumber: "A111AA797",
      state: CarState.WORKING,
      taxiParkId: northPark.id,
    }),
    ensureCar({
      firm: "Kia",
      model: "Rio",
      type: "Sedan",
      plateNumber: "B222BB797",
      state: CarState.EMERGENCY,
      taxiParkId: northPark.id,
    }),
    ensureCar({
      firm: "Hyundai",
      model: "Solaris",
      type: "Sedan",
      plateNumber: "C333CC797",
      state: CarState.REPAIR,
      taxiParkId: southPark.id,
    }),
    ensureCar({
      firm: "Skoda",
      model: "Octavia",
      type: "Liftback",
      plateNumber: "D444DD797",
      state: CarState.WORKING,
      taxiParkId: southPark.id,
    }),
    ensureCar({
      firm: "Volkswagen",
      model: "Polo",
      type: "Sedan",
      plateNumber: "E555EE797",
      state: CarState.WORKING,
      taxiParkId: airportPark.id,
    }),
  ]);

  await Promise.all([
    ensureInvitation(northPark.id, mainDriver.id, InvitationStatus.ACCEPTED),
    ensureInvitation(
      southPark.id,
      rejectedDriver.id,
      InvitationStatus.REJECTED,
    ),
    ensureInvitation(
      airportPark.id,
      pendingDriver.id,
      InvitationStatus.PENDING,
    ),
  ]);

  await prisma.driver.update({
    where: { id: mainDriver.id },
    data: {
      taxiParkId: northPark.id,
      assignedCarId: camry.id,
      passportNumber: "4012 556781",
      experience: 6,
    },
  });

  await prisma.driver.update({
    where: { id: parkTwoDriver.id },
    data: {
      taxiParkId: southPark.id,
      assignedCarId: solaris.id,
      passportNumber: "4013 112233",
      experience: 9,
    },
  });

  await prisma.driver.update({
    where: { id: rejectedDriver.id },
    data: {
      taxiParkId: null,
      assignedCarId: null,
      passportNumber: "4014 223344",
      experience: 4,
    },
  });

  await prisma.driver.update({
    where: { id: pendingDriver.id },
    data: {
      taxiParkId: null,
      assignedCarId: null,
      passportNumber: "4015 334455",
      experience: 2,
    },
  });

  await Promise.all([
    ensureWorkDay({
      driverId: mainDriver.id,
      carId: camry.id,
      workDate: new Date("2026-06-01T08:00:00.000Z"),
      revenue: 18500,
      carOnLine: true,
    }),
    ensureWorkDay({
      driverId: mainDriver.id,
      carId: camry.id,
      workDate: new Date("2026-06-02T08:00:00.000Z"),
      revenue: 0,
      carOnLine: false,
    }),
    ensureWorkDay({
      driverId: mainDriver.id,
      carId: camry.id,
      workDate: new Date("2026-06-03T08:00:00.000Z"),
      revenue: 14200,
      carOnLine: true,
    }),
    ensureWorkDay({
      driverId: parkTwoDriver.id,
      carId: solaris.id,
      workDate: new Date("2026-06-01T09:00:00.000Z"),
      revenue: 0,
      carOnLine: true,
    }),
    ensureWorkDay({
      driverId: parkTwoDriver.id,
      carId: solaris.id,
      workDate: new Date("2026-06-04T09:00:00.000Z"),
      revenue: 0,
      carOnLine: false,
    }),
  ]);

  await Promise.all([
    ensureActionLog({
      userId: directorUser.id,
      action: "CREATE_TAXI_PARK",
      description: "Demo seed: ensure North Fleet taxi park",
      taxiParkId: northPark.id,
      metadata: { seedKey: "north-park", taxiParkId: northPark.id },
    }),
    ensureActionLog({
      userId: directorUser.id,
      action: "CREATE_CAR",
      description: "Demo seed: ensure fleet cars",
      taxiParkId: southPark.id,
      metadata: {
        seedKey: "fleet-cars",
        carIds: [camry.id, rio.id, solaris.id, octavia.id, polo.id],
      },
    }),
    ensureActionLog({
      userId: directorUser.id,
      action: "INVITE_DRIVER",
      description: "Demo seed: invite pending driver to Airport Fleet",
      taxiParkId: airportPark.id,
      metadata: { seedKey: "pending-invite", driverId: pendingDriver.id },
    }),
    ensureActionLog({
      userId: driverUser.id,
      action: "ACCEPT_INVITATION",
      description: "Demo seed: accepted invitation into North Fleet",
      taxiParkId: northPark.id,
      metadata: { seedKey: "accepted-invite", driverId: mainDriver.id },
    }),
    ensureActionLog({
      userId: extraDriverUsers[1].id,
      action: "REJECT_INVITATION",
      description: "Demo seed: rejected invitation into South Fleet",
      taxiParkId: southPark.id,
      metadata: { seedKey: "rejected-invite", driverId: rejectedDriver.id },
    }),
    ensureActionLog({
      userId: directorUser.id,
      action: "ASSIGN_CAR",
      description: "Demo seed: assigned Camry to main demo driver",
      taxiParkId: northPark.id,
      metadata: {
        seedKey: "assign-main-car",
        driverId: mainDriver.id,
        carId: camry.id,
      },
    }),
    ensureActionLog({
      userId: directorUser.id,
      action: "CHANGE_CAR_STATE",
      description: "Demo seed: Solaris remains in repair state",
      taxiParkId: southPark.id,
      metadata: {
        seedKey: "solaris-repair",
        carId: solaris.id,
        state: solaris.state,
      },
    }),
    ensureActionLog({
      userId: driverUser.id,
      action: "CREATE_WORK_DAY",
      description: "Demo seed: created work days for main driver",
      taxiParkId: northPark.id,
      metadata: { seedKey: "main-driver-work-days", driverId: mainDriver.id },
    }),
  ]);

  console.log("Demo seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
