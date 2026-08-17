import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      //GET ROLES FROM DECORATOR
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    } // UNDEFINED ROLE = ENTRY ALLOWED

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: { role?: Role };
      }
    >();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('Access denied'); //NO USER NO ENTRY
    }

    return requiredRoles.includes(user.role); //MATCHING ROLES WITH THE USER
  }
}
