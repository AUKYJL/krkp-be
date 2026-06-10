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

const DAY = 24 * 60 * 60 * 1000;

type SeedUser = {
  key: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  passportNumber?: string | null;
  experience?: number | null;
};

type SeedTaxiPark = {
  key: string;
  directorKey: string;
  name: string;
  address: string;
};

type SeedCar = {
  key: string;
  taxiParkKey: string;
  firm: string;
  model: string;
  type: string;
  plateNumber: string;
  state: CarState;
};

type SeedDriverProfile = {
  driverKey: string;
  taxiParkKey?: string | null;
  assignedCarKey?: string | null;
  passportNumber?: string | null;
  experience?: number | null;
};

type SeedInvitation = {
  key: string;
  taxiParkKey: string;
  driverKey: string;
  status: InvitationStatus;
};

type SeedWorkDay = {
  key: string;
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
  key: string;
  userKey: string;
  action: string;
  description: string;
  taxiParkKey?: string | null;
  createdAt: Date;
  metadata?: Prisma.InputJsonObject;
};

const seedBaseDate = new Date("2026-06-09T00:00:00.000Z");

function daysAgo(days: number) {
  return new Date(seedBaseDate.getTime() - days * DAY);
}

function atTime(baseDate: Date, hours: number, minutes = 0) {
  const value = new Date(baseDate);
  value.setUTCHours(hours, minutes, 0, 0);
  return value;
}

const users: SeedUser[] = [
  {
    key: "director-main",
    fullName: "Demo Director",
    email: "admin@gmail.com",
    password: "adminadmin",
    role: UserRole.DIRECTOR,
  },
  {
    key: "director-west",
    fullName: "Irina Volkova",
    email: "irina.volkova@gmail.com",
    password: "volkova123",
    role: UserRole.DIRECTOR,
  },
  {
    key: "director-east",
    fullName: "Denis Morozov",
    email: "denis.morozov@gmail.com",
    password: "morozov123",
    role: UserRole.DIRECTOR,
  },
  {
    key: "director-empty",
    fullName: "Svetlana Orlova",
    email: "svetlana.orlova@gmail.com",
    password: "orlovadirector",
    role: UserRole.DIRECTOR,
  },
  {
    key: "driver-alpha",
    fullName: "Artem Loginov",
    email: "admin1@gmail.com",
    password: "admin1admin1",
    role: UserRole.DRIVER,
    passportNumber: "4012 556781",
    experience: 6,
  },
  {
    key: "driver-beta",
    fullName: "Pavel Petrov",
    email: "driver.petrov@gmail.com",
    password: "petrov123",
    role: UserRole.DRIVER,
    passportNumber: "4013 112233",
    experience: 9,
  },
  {
    key: "driver-gamma",
    fullName: "Nikita Sidorov",
    email: "driver.sidorov@gmail.com",
    password: "sidorov123",
    role: UserRole.DRIVER,
    passportNumber: "4014 223344",
    experience: 4,
  },
  {
    key: "driver-delta",
    fullName: "Ivan Smirnov",
    email: "driver.smirnov@gmail.com",
    password: "smirnov123",
    role: UserRole.DRIVER,
    passportNumber: "4015 334455",
    experience: 2,
  },
  {
    key: "driver-epsilon",
    fullName: "Oleg Kuznetsov",
    email: "driver.kuznetsov@gmail.com",
    password: "kuznetsov123",
    role: UserRole.DRIVER,
    passportNumber: "4016 445566",
    experience: 11,
  },
  {
    key: "driver-zeta",
    fullName: "Maria Volkova",
    email: "driver.volkova@gmail.com",
    password: "volkova456",
    role: UserRole.DRIVER,
    passportNumber: "4017 556677",
    experience: 7,
  },
  {
    key: "driver-eta",
    fullName: "Aleksei Romanov",
    email: "driver.romanov@gmail.com",
    password: "romanov123",
    role: UserRole.DRIVER,
    passportNumber: null,
    experience: null,
  },
  {
    key: "driver-theta",
    fullName: "Sergey Belov",
    email: "driver.belov@gmail.com",
    password: "belov123",
    role: UserRole.DRIVER,
    passportNumber: "4018 667788",
    experience: 1,
  },
  {
    key: "driver-iota",
    fullName: "Viktor Egorov",
    email: "driver.egorov@gmail.com",
    password: "egorov123",
    role: UserRole.DRIVER,
    passportNumber: "4019 778899",
    experience: 15,
  },
  {
    key: "driver-kappa",
    fullName: "Elena Fedorova",
    email: "driver.fedorova@gmail.com",
    password: "fedorova123",
    role: UserRole.DRIVER,
    passportNumber: "4020 889900",
    experience: null,
  },
  {
    key: "driver-lambda",
    fullName: "Andrey Makarov",
    email: "driver.makarov@gmail.com",
    password: "makarov123",
    role: UserRole.DRIVER,
    passportNumber: null,
    experience: 20,
  },
];

const taxiParks: SeedTaxiPark[] = [
  {
    key: "north-fleet",
    directorKey: "director-main",
    name: "North Fleet",
    address: "Moscow, Leningradsky Ave, 39",
  },
  {
    key: "airport-fleet",
    directorKey: "director-main",
    name: "Airport Fleet",
    address: "Khimki, Sheremetyevo Terminal B",
  },
  {
    key: "north-fleet-annex",
    directorKey: "director-main",
    name: "North Fleet Annex",
    address: "Moscow, Leningradsky Ave, 41",
  },
  {
    key: "west-line",
    directorKey: "director-west",
    name: "West Line",
    address: "Moscow, Kutuzovsky Ave, 12",
  },
  {
    key: "west-line-plus",
    directorKey: "director-west",
    name: "West Line Plus",
    address: "Moscow, Kutuzovsky Ave, 18",
  },
  {
    key: "west-empty",
    directorKey: "director-west",
    name: "West Reserve",
    address: "Moscow, Mozhayskoye Hwy, 9",
  },
  {
    key: "east-line",
    directorKey: "director-east",
    name: "East Line",
    address: "Moscow, Shchelkovskoye Hwy, 75",
  },
  {
    key: "east-logistics",
    directorKey: "director-east",
    name: "East Logistics",
    address: "Balashikha, Sovetskaya St, 22",
  },
  {
    key: "silent-park",
    directorKey: "director-east",
    name: "Silent Park",
    address: "Moscow, Entuziastov Hwy, 14",
  },
];

const cars: SeedCar[] = [
  {
    key: "camry",
    taxiParkKey: "north-fleet",
    firm: "Toyota",
    model: "Camry",
    type: "Sedan",
    plateNumber: "A111AA797",
    state: CarState.WORKING,
  },
  {
    key: "rio",
    taxiParkKey: "north-fleet",
    firm: "Kia",
    model: "Rio",
    type: "Sedan",
    plateNumber: "B222BB797",
    state: CarState.EMERGENCY,
  },
  {
    key: "sonata",
    taxiParkKey: "north-fleet",
    firm: "Hyundai",
    model: "Sonata",
    type: "Sedan",
    plateNumber: "M101MM797",
    state: CarState.WORKING,
  },
  {
    key: "solaris",
    taxiParkKey: "airport-fleet",
    firm: "Hyundai",
    model: "Solaris",
    type: "Sedan",
    plateNumber: "C333CC797",
    state: CarState.REPAIR,
  },
  {
    key: "octavia",
    taxiParkKey: "airport-fleet",
    firm: "Skoda",
    model: "Octavia",
    type: "Liftback",
    plateNumber: "D444DD797",
    state: CarState.WORKING,
  },
  {
    key: "jolion",
    taxiParkKey: "airport-fleet",
    firm: "Haval",
    model: "Jolion",
    type: "Crossover",
    plateNumber: "N202NN797",
    state: CarState.WORKING,
  },
  {
    key: "focus",
    taxiParkKey: "north-fleet-annex",
    firm: "Ford",
    model: "Focus",
    type: "Sedan",
    plateNumber: "O303OO797",
    state: CarState.WORKING,
  },
  {
    key: "polo",
    taxiParkKey: "west-line",
    firm: "Volkswagen",
    model: "Polo",
    type: "Sedan",
    plateNumber: "E555EE797",
    state: CarState.WORKING,
  },
  {
    key: "ceed",
    taxiParkKey: "west-line",
    firm: "Kia",
    model: "Ceed",
    type: "Hatchback",
    plateNumber: "F666FF797",
    state: CarState.WORKING,
  },
  {
    key: "sportage",
    taxiParkKey: "west-line-plus",
    firm: "Kia",
    model: "Sportage",
    type: "SUV",
    plateNumber: "P404PP797",
    state: CarState.EMERGENCY,
  },
  {
    key: "logan",
    taxiParkKey: "west-line-plus",
    firm: "Renault",
    model: "Logan",
    type: "Sedan",
    plateNumber: "R505RR797",
    state: CarState.WORKING,
  },
  {
    key: "rav4",
    taxiParkKey: "east-line",
    firm: "Toyota",
    model: "RAV4",
    type: "Crossover",
    plateNumber: "G777GG797",
    state: CarState.REPAIR,
  },
  {
    key: "elantra",
    taxiParkKey: "east-line",
    firm: "Hyundai",
    model: "Elantra",
    type: "Sedan",
    plateNumber: "H888HH797",
    state: CarState.WORKING,
  },
  {
    key: "geely",
    taxiParkKey: "east-logistics",
    firm: "Geely",
    model: "Coolray",
    type: "Crossover",
    plateNumber: "S606SS797",
    state: CarState.WORKING,
  },
];

const driverProfiles: SeedDriverProfile[] = [
  {
    driverKey: "driver-alpha",
    taxiParkKey: "north-fleet",
    assignedCarKey: "camry",
    passportNumber: "4012 556781",
    experience: 6,
  },
  {
    driverKey: "driver-beta",
    taxiParkKey: "airport-fleet",
    assignedCarKey: "octavia",
    passportNumber: "4013 112233",
    experience: 9,
  },
  {
    driverKey: "driver-gamma",
    taxiParkKey: null,
    assignedCarKey: null,
    passportNumber: "4014 223344",
    experience: 4,
  },
  {
    driverKey: "driver-delta",
    taxiParkKey: "west-line",
    assignedCarKey: "polo",
    passportNumber: "4015 334455",
    experience: 2,
  },
  {
    driverKey: "driver-epsilon",
    taxiParkKey: "east-line",
    assignedCarKey: "elantra",
    passportNumber: "4016 445566",
    experience: 11,
  },
  {
    driverKey: "driver-zeta",
    taxiParkKey: null,
    assignedCarKey: null,
    passportNumber: "4017 556677",
    experience: 7,
  },
  {
    driverKey: "driver-eta",
    taxiParkKey: "north-fleet-annex",
    assignedCarKey: null,
    passportNumber: null,
    experience: null,
  },
  {
    driverKey: "driver-theta",
    taxiParkKey: "west-line-plus",
    assignedCarKey: "logan",
    passportNumber: "4018 667788",
    experience: 1,
  },
  {
    driverKey: "driver-iota",
    taxiParkKey: "east-logistics",
    assignedCarKey: null,
    passportNumber: "4019 778899",
    experience: 15,
  },
  {
    driverKey: "driver-kappa",
    taxiParkKey: "airport-fleet",
    assignedCarKey: "jolion",
    passportNumber: "4020 889900",
    experience: null,
  },
  {
    driverKey: "driver-lambda",
    taxiParkKey: "east-line",
    assignedCarKey: null,
    passportNumber: null,
    experience: 20,
  },
];

const invitations: SeedInvitation[] = [
  {
    key: "invite-alpha-accepted",
    taxiParkKey: "north-fleet",
    driverKey: "driver-alpha",
    status: InvitationStatus.ACCEPTED,
  },
  {
    key: "invite-gamma-rejected",
    taxiParkKey: "airport-fleet",
    driverKey: "driver-gamma",
    status: InvitationStatus.REJECTED,
  },
  {
    key: "invite-zeta-pending",
    taxiParkKey: "west-line",
    driverKey: "driver-zeta",
    status: InvitationStatus.PENDING,
  },
  {
    key: "invite-eta-accepted",
    taxiParkKey: "north-fleet-annex",
    driverKey: "driver-eta",
    status: InvitationStatus.ACCEPTED,
  },
  {
    key: "invite-theta-accepted",
    taxiParkKey: "west-line-plus",
    driverKey: "driver-theta",
    status: InvitationStatus.ACCEPTED,
  },
  {
    key: "invite-iota-cancelled",
    taxiParkKey: "silent-park",
    driverKey: "driver-iota",
    status: InvitationStatus.CANCELLED,
  },
  {
    key: "invite-lambda-pending",
    taxiParkKey: "east-logistics",
    driverKey: "driver-lambda",
    status: InvitationStatus.PENDING,
  },
];

const workDays: SeedWorkDay[] = [];

function pushWorkDay(
  key: string,
  driverKey: string,
  carKey: string,
  daysBeforeBase: number,
  startHour: number,
  startMinute: number,
  durationHours: number | null,
  revenue: number,
  carOnLine: boolean,
  status: WorkDayStatus,
) {
  const workDate = daysAgo(daysBeforeBase);
  const startedAt = atTime(workDate, startHour, startMinute);
  const finishedAt =
    durationHours === null
      ? null
      : new Date(startedAt.getTime() + durationHours * 60 * 60 * 1000);

  workDays.push({
    key,
    driverKey,
    carKey,
    workDate,
    startedAt,
    finishedAt,
    revenue,
    carOnLine,
    status,
  });
}

const alphaHistory = [44, 40, 35, 28, 21, 14, 7, 3, 0];
const alphaRevenue = [12800, 15600, 14350, 20100, 16750, 0, 22300, 18900, 9600];
alphaHistory.forEach((dayOffset, index) => {
  pushWorkDay(
    `alpha-${dayOffset}`,
    "driver-alpha",
    "camry",
    dayOffset,
    8,
    index % 2 === 0 ? 0 : 15,
    dayOffset === 0 ? null : 10,
    alphaRevenue[index] ?? 10000,
    dayOffset !== 3,
    dayOffset === 14
      ? WorkDayStatus.DOWNTIME
      : dayOffset === 0
        ? WorkDayStatus.ACTIVE
        : WorkDayStatus.COMPLETED,
  );
});

const betaHistory = [
  { day: 43, revenue: 9200, onLine: true, status: WorkDayStatus.COMPLETED },
  { day: 31, revenue: 0, onLine: true, status: WorkDayStatus.DOWNTIME },
  { day: 19, revenue: 14100, onLine: false, status: WorkDayStatus.COMPLETED },
  { day: 8, revenue: 17800, onLine: true, status: WorkDayStatus.COMPLETED },
  { day: 1, revenue: 5400, onLine: false, status: WorkDayStatus.ACTIVE },
];

betaHistory.forEach(({ day, revenue, onLine, status }, index) => {
  pushWorkDay(
    `beta-${day}`,
    "driver-beta",
    "octavia",
    day,
    9,
    index * 5,
    status === WorkDayStatus.ACTIVE ? null : 9,
    revenue,
    onLine,
    status,
  );
});

[
  { day: 37, revenue: 7800, onLine: true },
  { day: 26, revenue: 8600, onLine: true },
  { day: 11, revenue: 11300, onLine: false },
].forEach(({ day, revenue, onLine }) => {
  pushWorkDay(
    `delta-${day}`,
    "driver-delta",
    "polo",
    day,
    7,
    45,
    9.5,
    revenue,
    onLine,
    WorkDayStatus.COMPLETED,
  );
});

[
  { day: 39, revenue: 16400, onLine: true, status: WorkDayStatus.COMPLETED },
  { day: 24, revenue: 0, onLine: true, status: WorkDayStatus.DOWNTIME },
  { day: 10, revenue: 22500, onLine: true, status: WorkDayStatus.COMPLETED },
  { day: 2, revenue: 3100, onLine: true, status: WorkDayStatus.ACTIVE },
].forEach(({ day, revenue, onLine, status }, index) => {
  pushWorkDay(
    `epsilon-${day}`,
    "driver-epsilon",
    "elantra",
    day,
    10,
    index === 3 ? 30 : 0,
    status === WorkDayStatus.ACTIVE ? null : 8.5,
    revenue,
    onLine,
    status,
  );
});

[
  { day: 33, revenue: 6400 },
  { day: 17, revenue: 8900 },
].forEach(({ day, revenue }) => {
  pushWorkDay(
    `theta-${day}`,
    "driver-theta",
    "logan",
    day,
    11,
    0,
    7.5,
    revenue,
    true,
    WorkDayStatus.COMPLETED,
  );
});

[
  { day: 42, revenue: 13200 },
  { day: 30, revenue: 14900 },
  { day: 12, revenue: 19800 },
].forEach(({ day, revenue }) => {
  pushWorkDay(
    `iota-${day}`,
    "driver-iota",
    "rav4",
    day,
    8,
    20,
    10,
    revenue,
    day !== 12,
    WorkDayStatus.COMPLETED,
  );
});

[
  { day: 29, revenue: 4200, status: WorkDayStatus.COMPLETED },
  { day: 15, revenue: 0, status: WorkDayStatus.DOWNTIME },
  { day: 4, revenue: 0, status: WorkDayStatus.ACTIVE },
].forEach(({ day, revenue, status }) => {
  pushWorkDay(
    `kappa-${day}`,
    "driver-kappa",
    "jolion",
    day,
    12,
    10,
    status === WorkDayStatus.ACTIVE ? null : 8,
    revenue,
    status !== WorkDayStatus.DOWNTIME,
    status,
  );
});

[
  { day: 36, revenue: 25600 },
  { day: 18, revenue: 27400 },
].forEach(({ day, revenue }) => {
  pushWorkDay(
    `lambda-${day}`,
    "driver-lambda",
    "rav4",
    day,
    6,
    50,
    11,
    revenue,
    true,
    WorkDayStatus.COMPLETED,
  );
});

const actionLogs: SeedActionLog[] = [
  {
    key: "log-create-north",
    userKey: "director-main",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created North Fleet taxi park",
    taxiParkKey: "north-fleet",
    createdAt: atTime(daysAgo(45), 9, 0),
    metadata: { seedKey: "north-fleet" },
  },
  {
    key: "log-create-airport",
    userKey: "director-main",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created Airport Fleet taxi park",
    taxiParkKey: "airport-fleet",
    createdAt: atTime(daysAgo(44), 11, 20),
    metadata: { seedKey: "airport-fleet" },
  },
  {
    key: "log-create-west-plus",
    userKey: "director-west",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created West Line Plus taxi park",
    taxiParkKey: "west-line-plus",
    createdAt: atTime(daysAgo(40), 10, 5),
    metadata: { seedKey: "west-line-plus" },
  },
  {
    key: "log-create-east-logistics",
    userKey: "director-east",
    action: "CREATE_TAXI_PARK",
    description: "Demo seed: created East Logistics taxi park",
    taxiParkKey: "east-logistics",
    createdAt: atTime(daysAgo(39), 14, 10),
    metadata: { seedKey: "east-logistics" },
  },
  {
    key: "log-car-batch-main",
    userKey: "director-main",
    action: "CREATE_CAR",
    description: "Demo seed: created mixed car fleet for North and Airport",
    taxiParkKey: "north-fleet",
    createdAt: atTime(daysAgo(38), 12, 0),
    metadata: {
      seedKey: "cars-main",
      plateNumbers: cars
        .filter((car) =>
          ["north-fleet", "airport-fleet", "north-fleet-annex"].includes(
            car.taxiParkKey,
          ),
        )
        .map((car) => car.plateNumber),
    },
  },
  {
    key: "log-invite-gamma",
    userKey: "director-main",
    action: "INVITE_DRIVER",
    description: "Demo seed: invited driver gamma to Airport Fleet",
    taxiParkKey: "airport-fleet",
    createdAt: atTime(daysAgo(34), 16, 0),
    metadata: { seedKey: "invite-gamma", driverKey: "driver-gamma" },
  },
  {
    key: "log-accept-alpha",
    userKey: "driver-alpha",
    action: "ACCEPT_INVITATION",
    description: "Demo seed: accepted invitation into North Fleet",
    taxiParkKey: "north-fleet",
    createdAt: atTime(daysAgo(33), 8, 40),
    metadata: { seedKey: "accept-alpha", driverKey: "driver-alpha" },
  },
  {
    key: "log-reject-gamma",
    userKey: "driver-gamma",
    action: "REJECT_INVITATION",
    description: "Demo seed: rejected invitation into Airport Fleet",
    taxiParkKey: "airport-fleet",
    createdAt: atTime(daysAgo(32), 19, 5),
    metadata: { seedKey: "reject-gamma", driverKey: "driver-gamma" },
  },
  {
    key: "log-cancel-iota",
    userKey: "director-east",
    action: "CANCEL_INVITATION",
    description: "Demo seed: cancelled invitation into Silent Park",
    taxiParkKey: "silent-park",
    createdAt: atTime(daysAgo(25), 10, 50),
    metadata: { seedKey: "cancel-iota", driverKey: "driver-iota" },
  },
  {
    key: "log-assign-cars",
    userKey: "director-main",
    action: "ASSIGN_CAR",
    description: "Demo seed: assigned cars to active drivers",
    taxiParkKey: "north-fleet",
    createdAt: atTime(daysAgo(20), 9, 30),
    metadata: {
      seedKey: "assignments",
      driverKeys: driverProfiles
        .filter((profile) => profile.assignedCarKey)
        .map((profile) => profile.driverKey),
    },
  },
  {
    key: "log-workdays-alpha",
    userKey: "driver-alpha",
    action: "CREATE_WORK_DAY",
    description: "Demo seed: created a mixed set of work days",
    taxiParkKey: "north-fleet",
    createdAt: atTime(daysAgo(18), 20, 15),
    metadata: {
      seedKey: "work-days-alpha",
      workDates: workDays
        .filter((item) => item.driverKey === "driver-alpha")
        .map((item) => item.workDate.toISOString()),
    },
  },
  {
    key: "log-rav4-repair",
    userKey: "director-east",
    action: "CHANGE_CAR_STATE",
    description: "Demo seed: marked Toyota RAV4 as needing repair",
    taxiParkKey: "east-line",
    createdAt: atTime(daysAgo(6), 13, 45),
    metadata: {
      seedKey: "rav4-repair",
      plateNumber: "G777GG797",
      state: CarState.REPAIR,
    },
  },
  {
    key: "log-emergency-rio",
    userKey: "director-main",
    action: "CHANGE_CAR_STATE",
    description: "Demo seed: marked Kia Rio as emergency after incident",
    taxiParkKey: "north-fleet",
    createdAt: atTime(daysAgo(2), 18, 25),
    metadata: {
      seedKey: "rio-emergency",
      plateNumber: "B222BB797",
      state: CarState.EMERGENCY,
    },
  },
  {
    key: "log-downtime-kappa",
    userKey: "driver-kappa",
    action: "UPDATE_WORK_DAY",
    description: "Demo seed: updated downtime work day for airport fleet",
    taxiParkKey: "airport-fleet",
    createdAt: atTime(daysAgo(4), 21, 5),
    metadata: {
      seedKey: "kappa-downtime",
      driverKey: "driver-kappa",
      status: WorkDayStatus.ACTIVE,
    },
  },
];

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}.${derivedKey.toString("hex")}`;
}

const userIds: Record<string, string> = {};
const directorIds: Record<string, string> = {};
const driverIds: Record<string, string> = {};
const taxiParkIds: Record<string, string> = {};
const carIds: Record<string, string> = {};

async function ensureUser(input: SeedUser) {
  const passwordHash = hashPassword(input.password);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      role: input.role,
      passwordHash,
    },
    create: {
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      passwordHash,
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

async function ensureTaxiPark(input: SeedTaxiPark) {
  const existing = await prisma.taxiPark.findFirst({
    where: {
      directorId: directorIds[input.directorKey],
      name: input.name,
    },
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
      directorId: directorIds[input.directorKey],
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

async function ensureDriverProfile(input: SeedDriverProfile) {
  return prisma.driver.update({
    where: { id: driverIds[input.driverKey] },
    data: {
      taxiParkId: input.taxiParkKey ? taxiParkIds[input.taxiParkKey] : null,
      assignedCarId: input.assignedCarKey ? carIds[input.assignedCarKey] : null,
      passportNumber: input.passportNumber ?? null,
      experience: input.experience ?? null,
    },
  });
}

async function ensureInvitation(input: SeedInvitation) {
  return prisma.driverInvitation.upsert({
    where: {
      taxiParkId_driverId: {
        taxiParkId: taxiParkIds[input.taxiParkKey],
        driverId: driverIds[input.driverKey],
      },
    },
    update: {
      status: input.status,
    },
    create: {
      taxiParkId: taxiParkIds[input.taxiParkKey],
      driverId: driverIds[input.driverKey],
      status: input.status,
    },
  });
}

async function ensureWorkDay(input: SeedWorkDay) {
  return prisma.workDay.upsert({
    where: {
      driverId_workDate: {
        driverId: driverIds[input.driverKey],
        workDate: input.workDate,
      },
    },
    update: {
      carId: carIds[input.carKey],
      startedAt: input.startedAt,
      finishedAt: input.finishedAt ?? null,
      revenue: new Prisma.Decimal(input.revenue),
      carOnLine: input.carOnLine,
      status: input.status,
    },
    create: {
      driverId: driverIds[input.driverKey],
      carId: carIds[input.carKey],
      workDate: input.workDate,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt ?? null,
      revenue: new Prisma.Decimal(input.revenue),
      carOnLine: input.carOnLine,
      status: input.status,
    },
  });
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
    createdAt: input.createdAt,
  };

  if (existing) {
    return prisma.actionLog.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.actionLog.create({ data });
}

async function main() {
  for (const user of users) {
    const created = await ensureUser(user);
    userIds[user.key] = created.id;
  }

  for (const user of users) {
    if (user.role === UserRole.DIRECTOR) {
      const director = await prisma.director.findUniqueOrThrow({
        where: { userId: userIds[user.key] },
      });
      directorIds[user.key] = director.id;
    }

    if (user.role === UserRole.DRIVER) {
      const driver = await prisma.driver.findUniqueOrThrow({
        where: { userId: userIds[user.key] },
      });
      driverIds[user.key] = driver.id;
    }
  }

  for (const park of taxiParks) {
    const created = await ensureTaxiPark(park);
    taxiParkIds[park.key] = created.id;
  }

  for (const car of cars) {
    const created = await ensureCar(car);
    carIds[car.key] = created.id;
  }

  for (const profile of driverProfiles) {
    await ensureDriverProfile(profile);
  }

  for (const invitation of invitations) {
    await ensureInvitation(invitation);
  }

  for (const workDay of workDays) {
    await ensureWorkDay(workDay);
  }

  for (const actionLog of actionLogs) {
    await ensureActionLog(actionLog);
  }

  console.log(
    `Demo seed completed successfully: ${users.length} users, ${taxiParks.length} taxi parks, ${cars.length} cars, ${workDays.length} work days.`,
  );
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
