import { Injectable } from '@nestjs/common';
import { Request } from 'express';

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
}

@Injectable()
export class DeviceInfoService {
  extractDeviceInfo(req?: Request): DeviceInfo {
    if (!req) {
      return {};
    }

    const userAgent = req.headers['user-agent'] || '';

    return {
      userAgent,
      ip: req.ip || req.connection.remoteAddress || undefined,
    };
  }
}
