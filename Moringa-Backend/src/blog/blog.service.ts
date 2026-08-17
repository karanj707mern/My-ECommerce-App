import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { sanitizeHtml } from '@/common/utils/sanitize.util';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async createPost(data: CreateBlogPostDto) {
    try {
      const post = await this.prisma.blogPost.create({
        data: {
          ...data,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        },
      });
      await this.invalidateBlogCaches();
      return post;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Blog post with this slug already exists.');
      }
      throw error;
    }
  }

  async getPublishedPosts() {
    const cached =
      await this.cache.getJson<Record<string, unknown>[]>('blog:published');
    if (cached) {
      return cached;
    }

    const posts = await this.prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
    });

    const result = posts.map((post) => ({
      ...post,
      title: sanitizeHtml(post.title),
      excerpt: sanitizeHtml(post.excerpt),
      content: sanitizeHtml(post.content),
    }));

    await this.cache.setJson('blog:published', result, 600);
    return result;
  }

  async getAllPosts() {
    const cached =
      await this.cache.getJson<Record<string, unknown>[]>('blog:all');
    if (cached) {
      return cached;
    }

    const posts = await this.prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const result = posts.map((post) => ({
      ...post,
      title: sanitizeHtml(post.title),
      excerpt: sanitizeHtml(post.excerpt),
      content: sanitizeHtml(post.content),
    }));

    await this.cache.setJson('blog:all', result, 300);
    return result;
  }

  async getPostBySlug(slug: string) {
    const cacheKey = `blog:slug:${slug}`;
    const cached = await this.cache.getJson<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const post = await this.prisma.blogPost.findFirst({
      where: { slug, published: true },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const result = {
      ...post,
      title: sanitizeHtml(post.title),
      excerpt: sanitizeHtml(post.excerpt),
      content: sanitizeHtml(post.content),
    };

    await this.cache.setJson(cacheKey, result, 600);
    return result;
  }

  async updatePost(id: number, data: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }

    try {
      const updated = await this.prisma.blogPost.update({
        where: { id },
        data: {
          ...data,
          publishedAt:
            data.publishedAt !== undefined
              ? data.publishedAt
                ? new Date(data.publishedAt)
                : null
              : undefined,
        },
      });

      await this.invalidateBlogCaches();

      return {
        ...updated,
        title: sanitizeHtml(updated.title),
        excerpt: sanitizeHtml(updated.excerpt),
        content: sanitizeHtml(updated.content),
      };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Blog post with this slug already exists.');
      }
      throw error;
    }
  }

  async remove(id: number) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.prisma.blogPost.delete({
      where: { id },
    });

    if (post.slug) {
      await this.cache.del(`blog:slug:${post.slug}`);
    }
    await this.invalidateBlogCaches();
  }

  private async invalidateBlogCaches() {
    await Promise.all([
      this.cache.del('blog:published'),
      this.cache.del('blog:all'),
    ]);
  }
}
