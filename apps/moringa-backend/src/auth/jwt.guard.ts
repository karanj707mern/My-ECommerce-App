import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { TokenRevocationService } from './services/token-revocation.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    /**
     * Public-route opt-out. Handler-level metadata wins over class-level.
     * Enables the global default-deny registration flip (APP_GUARD) without
     * touching every controller — public routes declare @Public() instead.
     */
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    // Cookie-first: HttpOnly accessToken is the primary browser credential;
    // Bearer remains for non-browser clients (SDK scripts, integrations).
    const token =
      request.cookies?.accessToken ||
      request.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });

      const isRevoked = await this.tokenRevocationService.isRevoked(payload.jti ?? payload.sub);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const session = await this.prisma.session.findFirst({
        where: {
          userId: payload.id,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session expired');
      }

      request.user = { id: payload.id, email: payload.email, role: payload.role };
      return true;
    } catch (error) {
      // Surface intentional auth failures verbatim (revocation / session
      // expiry) instead of masking them behind the generic invalid-token
      // message — observability for security triage without weakening the
      // response contract (all remain 401 UnauthorizedException).
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token');
    }
  }
}
