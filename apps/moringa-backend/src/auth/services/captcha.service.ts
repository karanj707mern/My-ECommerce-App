import { Injectable } from '@nestjs/common';

@Injectable()
export class CaptchaService {
  async generateCaptcha() {
    const text = Math.floor(1000 + Math.random() * 9000).toString();
    return {
      text,
      data: `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text x="10" y="30" font-size="24">${text}</text></svg>`).toString('base64')}`,
    };
  }

  async verifyCaptcha(captchaId: string, captchaInput: string): Promise<boolean> {
    return captchaInput === captchaId;
  }
}
