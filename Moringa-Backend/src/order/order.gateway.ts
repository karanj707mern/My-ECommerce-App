import { PrismaService } from '@/prisma/prisma.service';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { OrderEventsService } from './order-events.service';

interface AuthenticatedSocketData {
  userId?: number;
  role?: Role;
}

const defaultSocketCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://localhost:3000',
  'https://*.vercel.app',
  'https://*.vercel-preview.com',
];

const socketCorsOrigins = Array.from(
  new Set(
    [
      ...(process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? '').split(
        ',',
      ),
      ...defaultSocketCorsOrigins,
    ]
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

const isAllowedSocketOrigin = (origin: string | undefined) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.replace(/\/$/, '');

  return socketCorsOrigins.some((allowed) => {
    const normalizedAllowed = allowed.replace(/\/$/, '');

    if (normalizedAllowed === normalizedOrigin) {
      return true;
    }

    if (!normalizedAllowed.includes('*')) {
      return false;
    }

    const pattern = normalizedAllowed
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*');

    return new RegExp(`^${pattern}$`).test(normalizedOrigin);
  });
};

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedSocketOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'), false);
    },
    credentials: true,
  },
})
export class OrderGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  private readonly logger = new Logger(OrderGateway.name);
  private orderUpdatesSubscription?: Subscription;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly orderEventsService: OrderEventsService,
  ) {}

  afterInit(server: Server) {
    this.orderUpdatesSubscription = this.orderEventsService
      .subscribeOrderUpdates()
      .subscribe(({ userId, message }) => {
        server.to(`user:${userId}`).to('admin').emit(message.type, message);
      });
    this.logger.log('Order websocket gateway initialized on /orders');
  }

  async handleConnection(client: Socket) {
    const socketData = client.data as AuthenticatedSocketData;

    try {
      const token = this.getToken(client);
      const payload = await this.jwtService.verifyAsync<{ id?: number }>(token);

      if (!payload.id) {
        throw new Error('Token payload does not include a user id.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new Error('User not found.');
      }

      socketData.userId = user.id;
      socketData.role = user.role;

      await client.join(`user:${user.id}`);

      client.emit('connected', {
        type: 'connected',
        order: null,
      });

      if (user.role === Role.ADMIN) {
        await client.join('admin');
        await this.emitCachedAdminEvent(client);
      } else {
        await this.emitCachedUserEvent(client, user.id);
      }
    } catch (error) {
      this.logger.warn(
        `Rejected websocket client ${client.id}: ${
          error instanceof Error ? error.message : 'Authentication failed'
        }`,
      );
      client.emit('error', { message: 'Unauthorized websocket connection.' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const socketData = client.data as AuthenticatedSocketData;
    socketData.userId = undefined;
    socketData.role = undefined;
  }

  onModuleDestroy() {
    this.orderUpdatesSubscription?.unsubscribe();
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body?: unknown) {
    client.emit('pong', {
      received: body ?? null,
      at: new Date().toISOString(),
    });
  }

  private async emitCachedUserEvent(client: Socket, userId: number) {
    const cachedEvent = await this.orderEventsService
      .getLastOrderEvent(userId)
      .catch(() => null);

    if (cachedEvent?.type === 'order.updated') {
      client.emit(cachedEvent.type, cachedEvent);
    }
  }

  private async emitCachedAdminEvent(client: Socket) {
    const cachedEvent = await this.orderEventsService
      .getLastAdminOrderEvent()
      .catch(() => null);

    if (cachedEvent?.type === 'order.updated') {
      client.emit(cachedEvent.type, cachedEvent);
    }
  }

  private getToken(client: Socket): string {
    const authToken = client.handshake.auth?.token as string | undefined;

    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const queryToken = client.handshake.query?.token as string | undefined;

    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim();
    }

    const authorization = client.handshake.headers.authorization as
      string | string[] | undefined;
    const authorizationHeader = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      return authorizationHeader.slice('Bearer '.length).trim();
    }

    const cookieToken = this.getCookieValue(
      client.handshake.headers.cookie,
      'accessToken',
    );

    if (cookieToken) {
      return cookieToken;
    }

    throw new Error('Missing websocket authentication token.');
  }

  private getCookieValue(cookieHeader: string | undefined, name: string) {
    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const targetCookie = cookies.find((cookie) =>
      cookie.startsWith(`${name}=`),
    );

    if (!targetCookie) {
      return undefined;
    }

    return decodeURIComponent(targetCookie.slice(name.length + 1));
  }
}
