import { Module } from '@nestjs/common';
import { NewArrivalService } from './new-arrival.service';
import { NewArrivalController } from './new-arrival.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [NewArrivalController],
  providers: [NewArrivalService],
  exports: [NewArrivalService],
})
export class NewArrivalModule {}
