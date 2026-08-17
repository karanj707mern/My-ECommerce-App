import { Test, type TestingModule } from '@nestjs/testing';
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
      expect(
        Reflect.getMetadata('roles', controller.findAdminNotifications),
      ).toEqual(['ADMIN']);
    });

    it('requires ADMIN role for getHealth', () => {
      expect(Reflect.getMetadata('roles', controller.getHealth)).toEqual([
        'ADMIN',
      ]);
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
    };

    const userContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'USER' } }),
      }),
      getHandler: () => {},
      getClass: () => {},
    } as any;

    it('denies USER role access to findAdminNotifications', () => {
      const guard = new RolesGuard(mockReflector);
      expect(guard.canActivate(userContext)).toBe(false);
    });

    it('denies USER role access to getHealth', () => {
      const guard = new RolesGuard(mockReflector);
      expect(guard.canActivate(userContext)).toBe(false);
    });

    it('allows ADMIN role access to admin endpoints', () => {
      const adminContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'ADMIN' } }),
        }),
        getHandler: () => {},
        getClass: () => {},
      } as any;

      const guard = new RolesGuard(mockReflector);
      expect(guard.canActivate(adminContext)).toBe(true);
    });
  });
});
