import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderService } from './order.service';
import { OrderNotificationService } from './order-notification.service';
import { OrderEventsService } from './order-events.service';
import { CouponService } from '@/coupon/coupon.service';

describe('OrderService', () => {
  let service: OrderService;
  const prismaServiceMock = {
    cartItem: {
      findMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn(),
  };

  const orderNotificationServiceMock = {
    sendOrderPlaced: jest.fn(),
    sendPaymentConfirmed: jest.fn(),
    sendOrderStatusUpdated: jest.fn(),
    sendOrderCancelled: jest.fn(),
  };

  const couponServiceMock = {
    validate: jest.fn(),
  };

  const orderEventsServiceMock = {
    emitOrderUpdated: jest.fn(),
    subscribe: jest.fn(),
    subscribeAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: OrderNotificationService,
          useValue: orderNotificationServiceMock,
        },
        {
          provide: OrderEventsService,
          useValue: orderEventsServiceMock,
        },
        {
          provide: CouponService,
          useValue: couponServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
