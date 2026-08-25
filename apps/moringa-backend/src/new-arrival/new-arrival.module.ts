import { Module } from '@nestjs/common';
import { NewArrivalController } from './new-arrival.controller';
import { NewArrivalService } from './new-arrival.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NewArrivalController],
  providers: [NewArrivalService],
  exports: [NewArrivalService],
})
export class NewArrivalModule {}
