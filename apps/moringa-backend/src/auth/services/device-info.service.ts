import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

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
  extractDeviceInfo(req?: FastifyRequest): DeviceInfo {
    if (!req) {
      return {};
    }

    const userAgent = req.headers['user-agent'] || '';

    return {
      userAgent,
      ip: req.ip || req.socket?.remoteAddress || undefined,
    };
  }
}
