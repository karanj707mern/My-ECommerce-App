import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): object {
    return { message: 'Welcome to Our Lotus Moringa Store' };
  }
}
