import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisCacheService } from '@/cache/redis-cache.service';

interface ProductViewerMessage {
  type: 'product:viewers';
  productId: number;
  viewers: number;
}

@WebSocketGateway({
  namespace: '/products',
  cors: {
    origin: (
      _origin: string | undefined,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class ProductGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  private readonly logger = new Logger(ProductGateway.name);
  private readonly viewers = new Map<number, Set<string>>();
  private productViewersServer!: Server;
  private readonly productViewersKey = (productId: number) =>
    `products:viewers:${productId}`;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(private readonly redisCacheService: RedisCacheService) {
    this.logger.log('Product WebSocket gateway initialized on /products');
    this.startHealthCheck();
  }

  afterInit(server: Server) {
    this.productViewersServer = server;
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Product socket client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    for (const [productId, sockets] of this.viewers.entries()) {
      if (sockets.delete(client.id) && sockets.size === 0) {
        this.viewers.delete(productId);
      }

      await this.broadcastViewers(productId).catch(() => undefined);
    }

    this.logger.log(`Product socket client disconnected: ${client.id}`);
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  @SubscribeMessage('product:view')
  async handleProductView(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { productId: number },
  ) {
    const productId = Number(body.productId);

    if (!productId || productId <= 0) {
      client.emit('error', { message: 'Invalid product ID.' });
      return;
    }

    if (!this.viewers.has(productId)) {
      this.viewers.set(productId, new Set());
    }

    this.viewers.get(productId)!.add(client.id);

    await this.broadcastViewers(productId).catch(() => undefined);
  }

  private async broadcastViewers(productId: number) {
    const sockets = this.viewers.get(productId);
    const count = sockets?.size ?? 0;

    await this.redisCacheService
      .setJson(
        this.productViewersKey(productId),
        { count, timestamp: new Date().toISOString() },
        60,
      )
      .catch(() => undefined);

    this.productViewersServer.emit('product:viewers', {
      type: 'product:viewers',
      productId,
      viewers: count,
    });

    this.logger.log(`Product ${productId} has ${count} live viewer(s)`);
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.cleanupStaleViewers();
    }, 60000);
  }

  private cleanupStaleViewers(): void {
    for (const [productId, sockets] of this.viewers.entries()) {
      if (sockets.size === 0) {
        this.viewers.delete(productId);
      }
    }
  }
}
