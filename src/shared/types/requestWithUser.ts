import type { Request } from "express";
import type { ROLE } from "./roles";

export type RequestWithCurrentUser = Request & {
  currentUser: {
    id: string;
  };
  role: ROLE;
};
