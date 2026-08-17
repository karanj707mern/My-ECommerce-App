import { Injectable } from '@nestjs/common';
import geoip from 'geoip-lite';

export interface DeviceInfo {
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

@Injectable()
export class DeviceInfoService {
  extractDeviceInfo(req: {
    get: (key: string) => string | undefined;
    ip?: string;
    socket?: { remoteAddress?: string };
  }): DeviceInfo {
    const userAgent = req.get('user-agent') || '';
    const ip = req.ip || req.socket?.remoteAddress || 'Unknown';

    return {
      userAgent,
      browser: this.detectBrowser(userAgent),
      os: this.detectOS(userAgent),
      device: this.detectDevice(userAgent),
      ip,
      ...this.lookupGeo(ip),
    };
  }

  private lookupGeo(
    ip: string,
  ): Pick<DeviceInfo, 'country' | 'region' | 'city' | 'timezone'> {
    if (!ip || ip === 'Unknown' || ip === '::1' || ip.startsWith('127.')) {
      return {};
    }

    try {
      const geo = geoip.lookup(ip);

      if (!geo) {
        return {};
      }

      return {
        country: geo.country || undefined,
        region: geo.region || undefined,
        city: geo.city || undefined,
        timezone: geo.timezone || undefined,
      };
    } catch {
      return {};
    }
  }

  private detectBrowser(userAgent: string): string {
    if (userAgent.includes('Edg/')) {
      return 'Microsoft Edge';
    }
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      return 'Google Chrome';
    }
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      return 'Safari';
    }
    if (userAgent.includes('Firefox/')) {
      return 'Mozilla Firefox';
    }
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      return 'Internet Explorer';
    }
    return 'Unknown Browser';
  }

  private detectOS(userAgent: string): string {
    if (userAgent.includes('Windows')) {
      return 'Windows';
    }
    if (userAgent.includes('Mac OS X')) {
      return 'macOS';
    }
    if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
      return 'Linux';
    }
    if (userAgent.includes('Android')) {
      return 'Android';
    }
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'iOS';
    }
    return 'Unknown OS';
  }

  private detectDevice(userAgent: string): string {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      return 'Mobile';
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }
}
