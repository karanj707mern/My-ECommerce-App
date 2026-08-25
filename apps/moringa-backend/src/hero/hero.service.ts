import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HeroService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.heroImage.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
