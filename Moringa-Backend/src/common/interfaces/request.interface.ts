import type { Request } from 'express';

export interface GuestTokenRequest extends Request {
  guestToken?: string;
}
