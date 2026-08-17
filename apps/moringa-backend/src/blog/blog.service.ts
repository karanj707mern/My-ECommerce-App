import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(skip = 0, take = 20) {
    return this.prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      skip,
      take,
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.blogPost.findUnique({
      where: { slug },
    });
  }

  async findFeatured() {
    return this.prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });
  }
}
