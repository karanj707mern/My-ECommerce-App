import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class NewArrivalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.newArrival.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
