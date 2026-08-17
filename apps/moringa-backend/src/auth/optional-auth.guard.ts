import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OptionalAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return super.canActivate(context);
    } catch {
      return true;
    }
  }
}
