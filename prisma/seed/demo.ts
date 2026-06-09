import "dotenv/config";
import {
  CarState,
  InvitationStatus,
  Prisma,
  PrismaClient,
  UserRole,
  WorkDayStatus,
} from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

type SeedUser = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  passportNumber?: string;
  experience?: number;
};

type SeedDirector = {
  userKey: string;
  taxiParks: Array<{
    name: string;
    address: string;
  }>;
};

type SeedCar = {
  key: string;
  firm: string;
  model: string;
  type: string;
  plateNumber: string;
  state: CarState;
  taxiParkKey: string;
};

type SeedDriverAssignment = {
  userKey: string;
  taxiParkKey: string | null;
  assignedCarKey: string | null;
  passportNumber: string;
  experience: number;
};

type SeedWorkDay = {
  driverKey: string;
  carKey: string;
  workDate: Date;
  startedAt: Date;
  finishedAt?: Date | null;
  revenue: number;
  carOnLine: boolean;
  status: WorkDayStatus;
};

type SeedActionLog = {
  userKey: string;
  action: string;
  description: string;
  taxiParkKey?: string | null;
  metadata?: Prisma.InputJsonObject;
};

const userDefinitions: Record<string, SeedUser> = {
  "director-main": {
    fullName: "Demo Director",
    email: "admin@gmail.com",
    password: "adminadmin",
    role: UserRole.DIRECTOR,
  },
  "director-west": {
    fullName: "Irina Volkova",
    email: "irina.volkova@gmail.com",
    password: "volkova123",
    role: UserRole.DIRECTOR,
  },
  "director-east": {
    fullName: "Denis Morozov",
    email: "denis.morozov@gmail.com",
    password: "morozov123",
    role: UserRole.DIRECTOR,
  },
  "driver-alpha": {
    fullName: "Artem Loginov",
    email: "admin1@gmail.com",
    password: "admin1admin1",
    role: UserRole.DRIVER,
    passportNumber: "4012 556781",
    experience: 6,
  },
  "driver-beta": {
    fullName: "Pavel Petrov",
    email: "driver.petrov@gmail.com",
    password: "petrov123",
    role: UserRole.DRIVER,
    passportNumber: "4013 112233",
    experience: 9,
  },
  "driver-gamma": {
    fullName: "Nikita Sidorov",
    email: "driver.sidorov@gmail.com",
    password: "sidorov123",
    role: UserRole.DRIVER,
    passportNumber: "4014 223344",
    experience: 4,
  },
  "driver-delta": {
    fullName: "Ivan Smirnov",
    email: "driver.smirnov@gmail.com",
    password: "smirnov123",
    role: UserRole.DRIVER,
    passportNumber: "4015 334455",
    experience: 2,
  },
  "driver-epsilon": {
    fullName: "Oleg Kuznetsov",
    email: "driver.kuznetsov@gmail.com",
    password: "kuznetsov123",
    role: UserRole.DRIVER,
    passportNumber: "4016 445566",
    experience: 11,
  },
  "driver-zeta": {
    fullName: "Maria Volkova",
    email: "driver.volkova@gmail.com",
    password: "volkova456",
    role: UserRole.DRIVER,
    passportNumber: "4017 556677",
    experience: 7,
  },
};

const directorDefinitions: SeedDirector[] = [
  {
    userKey: "director-main",
    taxiParks: [
      {
        name: "North Fleet",
        address: "Moscow, Leningradsky Ave, 39",
      },
      {
        name: "Airport Fleet",
        address: "Khimki, Sheremetyevo Terminal B",
      },
    ],
  },
  {
    userKey: "director-west",
    taxiParks: [
      {
        name: "West Line",
        address: "Moscow, Kutuzovsky Ave, 12",
      },
    ],
  },
  {
    userKey: "director-east",
    taxiParks: [
      {
        name: "East Line",
        address: "Moscow, Shchelkovskoye Hwy, 75",
      },
    ],
  },
];

const carDefinitions: SeedCar[] = [
  {
    key: "camry",
    firm: "Toyota",
    model: "Camry",
    type: "Sedan",
    plateNumber: "A111AA797",
    state: CarState.WORKING,
    taxiParkKey: "north-fleet",
  },
  {
    key: "rio",
    firm: "Kia",
    model: "Rio",
    type: "Sedan",
    plateNumber: "B222BB797",
    state: CarState.EMERGENCY,
    taxiParkKey: "north-fleet",
  },
  {
    key: "solaris",
    firm: "Hyundai",
    model: "Solaris",
    type: "Sedan",
    plateNumber: "C333CC797",
    state: CarState.REPAIR,
    taxiParkKey: "airport-fleet",
  },
  {
    key: "octavia",
    firm: "Skoda",
    model: "Octavia",
    type: "Liftback",
    plateNumber: "D444DD797",
    state: CarState.WORKING,
    taxiParkKey: "airport-fleet",
  },
  {
    key: "polo",
    firm: "Volkswagen",
    model: "Polo",
    type: "Sedan",
    plateNumber: "E555EE797",
    state: CarState.WORKING,
    taxiParkKey: "west-line",
  },
  {
    key: "ceed",
    firm: "Kia",
    model: "Ceed",
    type: "Hatchback",
    plateNumber: "F666FF797",
    state: CarState.WORKING,
    taxiParkKey: "west-line",
  },
  {
    key: "rav4",
    firm: "Toyota",
    model: "RAV4",
    type: "Crossover",
    plateNumber: "G777GG797",
    state: CarState.REPAIR,
    taxiParkKey: "east-line",
  },
  {
    key: "elantra",
    firm: "Hyundai",
    model: "Elantra",
    type: "Sedan",
    plateNumber: "H888HH797",
    state: CarState.WORKING,
    taxiParkKey: "east-line",
  },
];

const driverAssignments: SeedDriverAssignment[] = [
  {
    userKey: "driver-alpha",
    taxiParkKey: "north-fleet",
    assignedCarKey: "camry",
    passportNumber: "4012 556781",
    experience: 6,
  },
  {
    userKey: "driver-beta",
    taxiParkKey: "airport-fleet",
    assignedCarKey: "octavia",
    passportNumber: "4013 112233",
    experience: 9,
  },
  {
    userKey: "driver-gamma",
    taxiParkKey: null,
    assignedCarKey: null,
    passportNumber: "4014 223344",
    experience: 4,
  },
  {
    userKey: "driver-delta",
    taxiParkKey: "west-line",
    assignedCarKey: "polo",
    passportNumber: "4015 334455",
    experience: 2,
  },
  {
    userKey: "driver-epsilon",
    taxiParkKey: "east-line",
    assignedCarKey: "elantra",
    passportNumber: "4016 445566",
    experience: 11,
  },
  {
    userKey: "driver-zeta",
    taxiParkKey: null,
    assignedCarKey: null,
    passportNumber: "4017 556677",
    experience: 7,
  },
];

const workDays: SeedWorkDay[] = [
  {
    driverKey: "driver-alpha",
    carKey: "camry",
    workDate: new Date("2026-06-01T00:00:00.000Z"),
    startedAt: new Date("2026-06-01T08:00:00.000Z"),
    finishedAt: new Date("2026-06-01T19:10:00.000Z"),
    revenue: 18500,
    carOnLine: true,
    status: WorkDayStatus.COMPLETED,
  },
  {
    driverKey: "driver-alpha",
    carKey: "camry",
    workDate: new Date("2026-06-02T00:00:00.000Z"),
    startedAt: new Date("2026-06-02T08:15:00.000Z"),
    finishedAt: null,
    revenue: 9200,
    carOnLine: true,
    status: WorkDayStatus.ACTIVE,
  },
  {
    driverKey: "driver-beta",
    carKey: "octavia",
    workDate: new Date("2026-06-01T00:00:00.000Z"),
    startedAt: new Date("2026-06-01T09:00:00.000Z"),
    finishedAt: new Date("2026-06-01T18:00:00.000Z"),
    revenue: 0,
    carOnLine: true,
    status: WorkDayStatus.DOWNTIME,
  },
  {
    driverKey: "driver-beta",
    carKey: "octavia",
    workDate: new Date("2026-06-04T00:00:00.000Z"),
    startedAt: new Date("2026-06-04T09:10:00.000Z"),
    finishedAt: new Date("2026-06-04T18:45:00.000Z"),
    revenue: 14200,
    carOnLine: false,
    status: WorkDayStatus.COMPLETED,
  },
  {
    driverKey: "driver-delta",
    carKey: "polo",
    workDate: new Date("2026-06-03T00:00:00.000Z"),
    startedAt: new Date("2026-06-03T07:45:00.000Z"),
    finishedAt: new Date("2026-06-03T17:20:00.000Z"),
    revenue: 7800,
    carOnLine: true,
    status: WorkDayStatus.COMPLETED,
  },
  {
    driverKey: "driver-epsilon",
    carKey: "elantra",
    workDate: new Date("2026-06-02T00:00:00.000Z"),
    startedAt: new Date("2026-06-02T10:00:00.000Z"),
    finishedAt: null,
    revenue: 0,
    carOnLine: true,
    status: WorkDayStatus.ACTIVE,
  },
];

const actionLogs: SeedActionLog[] = [
  {
    userKey: "director-main",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created North Fleet taxi park",
    taxiParkKey: "north-fleet",
    metadata: { seedKey: "north-fleet" },
  },
  {
    userKey: "director-main",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created Airport Fleet taxi park",
    taxiParkKey: "airport-fleet",
    metadata: { seedKey: "airport-fleet" },
  },
  {
    userKey: "director-west",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created West Line taxi park",
    taxiParkKey: "west-line",
    metadata: { seedKey: "west-line" },
  },
  {
    userKey: "director-east",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created East Line taxi park",
    taxiParkKey: "east-line",
    metadata: { seedKey: "east-line" },
  },
  {
    userKey: "director-main",
    action: "CREATE_CAR",
    description: "Demo seed: created mixed car fleet",
    taxiParkKey: "north-fleet",
    metadata: {
      seedKey: "cars",
      plateNumbers: carDefinitions.map((car) => car.plateNumber),
    },
  },
  {
    userKey: "director-main",
    action: "INVITE_DRIVER",
    description: "Demo seed: invited driver gamma to Airport Fleet",
    taxiParkKey: "airport-fleet",
    metadata: { seedKey: "invite-gamma", driverKey: "driver-gamma" },
  },
  {
    userKey: "driver-alpha",
    action: "ACCEPT_INVITATION",
    description: "Demo seed: accepted invitation into North Fleet",
    taxiParkKey: "north-fleet",
    metadata: { seedKey: "accept-alpha", driverKey: "driver-alpha" },
  },
  {
    userKey: "driver-gamma",
    action: "REJECT_INVITATION",
    description: "Demo seed: rejected invitation into Airport Fleet",
    taxiParkKey: "airport-fleet",
    metadata: { seedKey: "reject-gamma", driverKey: "driver-gamma" },
  },
  {
    userKey: "director-main",
    action: "ASSIGN_CAR",
    description: "Demo seed: assigned cars to active drivers",
    taxiParkKey: "north-fleet",
    metadata: {
      seedKey: "assignments",
      driverKeys: driverAssignments
        .filter((assignment) => assignment.assignedCarKey)
        .map((assignment) => assignment.userKey),
    },
  },
  {
    userKey: "driver-alpha",
    action: "CREATE_WORK_DAY",
    description: "Demo seed: created a mixed set of work days",
    taxiParkKey: "north-fleet",
    metadata: {
      seedKey: "work-days",
      workDates: workDays.map((workDay) => workDay.workDate.toISOString()),
    },
  },
  {
    userKey: "director-east",
    action: "CHANGE_CAR_STATE",
    description: "Demo seed: marked Toyota RAV4 as needing repair",
    taxiParkKey: "east-line",
    metadata: {
      seedKey: "rav4-repair",
      plateNumber: "G777GG797",
      state: CarState.REPAIR,
    },
  },
];

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}.${derivedKey.toString("hex")}`;
}

async function ensureUser(input: SeedUser) {
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
        passportNumber: input.passportNumber ?? null,
        experience: input.experience ?? null,
      },
      create: {
        userId: user.id,
        passportNumber: input.passportNumber ?? null,
        experience: input.experience ?? null,
      },
    });
  }

  return user;
}

async function ensureTaxiPark(
  directorId: string,
  input: { name: string; address: string },
) {
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

async function ensureCar(input: SeedCar) {
  return prisma.car.upsert({
    where: { plateNumber: input.plateNumber },
    update: {
      firm: input.firm,
      model: input.model,
      type: input.type,
      state: input.state,
      taxiParkId: taxiParkIds[input.taxiParkKey],
    },
    create: {
      firm: input.firm,
      model: input.model,
      type: input.type,
      plateNumber: input.plateNumber,
      state: input.state,
      taxiParkId: taxiParkIds[input.taxiParkKey],
    },
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

async function ensureWorkDay(input: SeedWorkDay) {
  const existing = await prisma.workDay.findFirst({
    where: {
      driverId: driverIds[input.driverKey],
      workDate: input.workDate,
    },
    select: { id: true },
  });

  const payload = {
    driverId: driverIds[input.driverKey],
    carId: carIds[input.carKey],
    workDate: input.workDate,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt ?? null,
    revenue: new Prisma.Decimal(input.revenue),
    carOnLine: input.carOnLine,
    status: input.status,
  };

  if (existing) {
    return prisma.workDay.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.workDay.create({ data: payload });
}

async function ensureActionLog(input: SeedActionLog) {
  const existing = await prisma.actionLog.findFirst({
    where: {
      userId: userIds[input.userKey],
      action: input.action,
      description: input.description,
    },
    select: { id: true },
  });

  const data = {
    userId: userIds[input.userKey],
    taxiParkId: input.taxiParkKey ? taxiParkIds[input.taxiParkKey] : null,
    action: input.action,
    description: input.description,
    metadata: input.metadata,
  };

  if (existing) {
    return prisma.actionLog.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.actionLog.create({
    data,
  });
}

const userIds: Record<string, string> = {};
const directorIds: Record<string, string> = {};
const taxiParkIds: Record<string, string> = {};
const driverIds: Record<string, string> = {};
const carIds: Record<string, string> = {};

async function main() {
  for (const [key, definition] of Object.entries(userDefinitions)) {
    const user = await ensureUser(definition);
    userIds[key] = user.id;
  }

  for (const definition of directorDefinitions) {
    const director = await prisma.director.findUniqueOrThrow({
      where: { userId: userIds[definition.userKey] },
    });

    directorIds[definition.userKey] = director.id;
    for (const park of definition.taxiParks) {
      const taxiPark = await ensureTaxiPark(director.id, park);
      taxiParkIds[
        park.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      ] = taxiPark.id;
    }
  }

  for (const [key, user] of Object.entries(userDefinitions)) {
    if (user.role !== UserRole.DRIVER) {
      continue;
    }

    const driver = await prisma.driver.findUniqueOrThrow({
      where: { userId: userIds[key] },
    });

    driverIds[key] = driver.id;
  }

  for (const car of carDefinitions) {
    const created = await ensureCar(car);
    carIds[car.key] = created.id;
  }

  for (const assignment of driverAssignments) {
    await prisma.driver.update({
      where: { id: driverIds[assignment.userKey] },
      data: {
        taxiParkId: assignment.taxiParkKey ? taxiParkIds[assignment.taxiParkKey] : null,
        assignedCarId: assignment.assignedCarKey
          ? carIds[assignment.assignedCarKey]
          : null,
        passportNumber: assignment.passportNumber,
        experience: assignment.experience,
      },
    });
  }

  await ensureInvitation(
    taxiParkIds["north-fleet"],
    driverIds["driver-alpha"],
    InvitationStatus.ACCEPTED,
  );
  await ensureInvitation(
    taxiParkIds["airport-fleet"],
    driverIds["driver-gamma"],
    InvitationStatus.REJECTED,
  );
  await ensureInvitation(
    taxiParkIds["west-line"],
    driverIds["driver-zeta"],
    InvitationStatus.PENDING,
  );

  for (const workDay of workDays) {
    await ensureWorkDay(workDay);
  }

  for (const actionLog of actionLogs) {
    await ensureActionLog(actionLog);
  }

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
