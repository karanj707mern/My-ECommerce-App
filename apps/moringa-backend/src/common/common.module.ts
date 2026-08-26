import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PinoModule } from './logger/pino.module';
import { RequestContextModule } from './request-context/request-context.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV ?? 'development'}`],
    }),
    PinoModule,
    RequestContextModule,
  ],
  exports: [ConfigModule, PinoModule, RequestContextModule],
})
export class CommonModule {}
