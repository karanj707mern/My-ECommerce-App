import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RolesGuard } from '@/auth/rolesguard';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;

  const notificationServiceMock = {
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markNotificationAsRead: jest.fn(),
    markAllNotificationsAsRead: jest.fn(),
    getUserPreferences: jest.fn(),
    updateNotificationPreference: jest.fn(),
    findAdminNotifications: jest.fn(),
    getHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  describe('admin endpoints', () => {
    it('requires ADMIN role for findAdminNotifications', () => {
      // Metadata lives on the exact function the decorator touched — binding
      // would create an undecorated copy.
      expect(
        // eslint-disable-next-line @typescript-eslint/unbound-method -- see above
        Reflect.getMetadata('roles', controller.findAdminNotifications)
      ).toEqual(['ADMIN']);
    });

    it('requires ADMIN role for getHealth', () => {
      expect(
        // eslint-disable-next-line @typescript-eslint/unbound-method -- see above
        Reflect.getMetadata('roles', controller.getHealth)
      ).toEqual(['ADMIN']);
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('USER role access denial', () => {
    const mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;

    /** Minimal ExecutionContext carrying only the authenticated role. */
    const makeContext = (role: string): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user: { role } }),
        }),
        getHandler: () => undefined,
        getClass: () => undefined,
      }) as unknown as ExecutionContext;

    it('denies USER role access to findAdminNotifications', () => {
      const guard = new RolesGuard(mockReflector);
      // RolesGuard signals denial with a 403 ForbiddenException (Nest's
      // canonical authorization failure) rather than a bare false return.
      expect(() => guard.canActivate(makeContext('USER'))).toThrow(ForbiddenException);
    });

    it('denies USER role access to getHealth', () => {
      const guard = new RolesGuard(mockReflector);
      expect(() => guard.canActivate(makeContext('USER'))).toThrow(ForbiddenException);
    });

    it('allows ADMIN role access to admin endpoints', () => {
      const guard = new RolesGuard(mockReflector);
      expect(guard.canActivate(makeContext('ADMIN'))).toBe(true);
    });
  });
});
