import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RequestWithCurrentUser } from "src/shared/types/requestWithUser";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const contextType: "http" | "telegraf" = context.getType();
    if (contextType === "telegraf") return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // если роли не заданы, доступ открыт
    }

    const req: RequestWithCurrentUser = context.switchToHttp().getRequest();

    if (!req.currentUser || !requiredRoles.includes(req.role)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}
