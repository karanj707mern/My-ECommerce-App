import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request & { cookies?: { accessToken?: string } }) => {
          return request?.cookies?.accessToken || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey:
        config.get<string>('app.jwtSecret') ||
        (() => {
          throw new Error('JWT_SECRET not found');
        })(),
    });
  }

  async validate(payload: { id?: number }) {
    if (!payload.id) {
      throw new UnauthorizedException('Invalid token');
    }

    const key = `auth:user:${payload.id}`;
    const cachedUser = await this.cache.getJson<{
      name: string;
      id: number;
      email: string;
      role: string;
    }>(key);

    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        name: true,
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (this.cache.isEnabled) {
      await this.cache.setJson(key, user, 60);
    }

    return user;
  }
}
