import { Module } from '@nestjs/common';
import { ConfigService } from './app.config';

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}
