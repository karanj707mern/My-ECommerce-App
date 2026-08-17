import { EmailVerificationService } from '@/auth/email-verification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { sanitizeHtml } from '@/common/utils/sanitize.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, ReviewStatus } from '@prisma/client';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly cache: RedisCacheService,
  ) {}

  private isMissingReviewTable(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021' &&
      (error.meta?.modelName === 'Review' ||
        error.meta?.modelName === 'ReviewComment')
    );
  }

  private getUnavailableReviewPayload() {
    return {
      summary: {
        averageRating: 0,
        reviewCount: 0,
        ratingBreakdown: [5, 4, 3, 2, 1].map((rating) => ({
          rating,
          count: 0,
        })),
      },
      reviews: [],
    };
  }

  private getUnavailableFeaturedReviewPayload() {
    return {
      reviews: [],
    };
  }

  private readonly reviewInclude = {
    user: {
      select: {
        id: true,
        name: true,
      },
    },
    comments: {
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  } as const;

  private async ensureProductExists(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async getEligibleDeliveredOrder(userId: number, productId: number) {
    return this.prisma.order.findFirst({
      where: {
        userId,
        status: OrderStatus.DELIVERED,
        items: {
          some: {
            productId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getFeaturedReviews(limit = 6) {
    const cacheKey = `reviews:featured:${limit}`;
    const cached = await this.cache.getJson<{
      reviews: {
        id: number;
        title: string | null;
        content: string;
        user: { id: number; name: string };
        product: { id: number; name: string; image: string | null };
      }[];
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    let reviews: {
      id: number;
      title: string | null;
      content: string;
      user: { id: number; name: string };
      product: { id: number; name: string; image: string | null };
    }[];

    try {
      reviews = await this.prisma.review.findMany({
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      });
    } catch (error: unknown) {
      if (this.isMissingReviewTable(error)) {
        return this.getUnavailableFeaturedReviewPayload();
      }

      throw error;
    }

    const result = {
      reviews: reviews.map((review) => ({
        ...review,
        title: review.title ? sanitizeHtml(review.title) : null,
        content: sanitizeHtml(review.content),
      })),
    };

    await this.cache.setJson(cacheKey, result, 300);
    return result;
  }

  async getProductReviews(productId: number) {
    await this.ensureProductExists(productId);
    const cacheKey = `reviews:product:${productId}`;
    const cached = await this.cache.getJson<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    let reviews: { rating: number; [key: string]: unknown }[];

    try {
      reviews = await this.prisma.review.findMany({
        where: { productId, status: ReviewStatus.APPROVED },
        include: this.reviewInclude,
        orderBy: [{ createdAt: 'desc' }],
      });
    } catch (error: unknown) {
      if (this.isMissingReviewTable(error)) {
        return this.getUnavailableReviewPayload();
      }

      throw error;
    }

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? Number(
            (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviewCount
            ).toFixed(1),
          )
        : 0;

    const result = {
      summary: {
        averageRating,
        reviewCount,
        ratingBreakdown: [5, 4, 3, 2, 1].map((rating) => ({
          rating,
          count: reviews.filter((review) => review.rating === rating).length,
        })),
      },
      reviews: reviews.map((review) => ({
        ...review,
        title: (review.title as string | null)
          ? sanitizeHtml(review.title as string)
          : null,
        content: sanitizeHtml(review.content as string),
        comments:
          (
            review.comments as
              (Record<string, unknown> & { content: string })[] | undefined
          )?.map((comment) => ({
            ...comment,
            content: sanitizeHtml(comment.content),
          })) || [],
      })),
    };

    await this.cache.setJson(cacheKey, result, 300);
    return result;
  }

  async getReviewEligibility(userId: number, productId: number) {
    await this.ensureProductExists(productId);

    try {
      const [existingReview, qualifyingOrder] = await Promise.all([
        this.prisma.review.findUnique({
          where: {
            userId_productId: {
              userId,
              productId,
            },
          },
          select: { id: true },
        }),
        this.getEligibleDeliveredOrder(userId, productId),
      ]);

      if (existingReview) {
        return {
          canReview: false,
          hasReviewed: true,
          reason: 'You already posted a review for this product.',
        };
      }

      if (!qualifyingOrder) {
        return {
          canReview: false,
          hasReviewed: false,
          reason: 'Buy this product first to unlock reviews.',
        };
      }

      return {
        canReview: true,
        hasReviewed: false,
        reason: 'You can rate and review this item.',
      };
    } catch (error: unknown) {
      if (this.isMissingReviewTable(error)) {
        return {
          canReview: false,
          hasReviewed: false,
          reason:
            'Reviews will be available after the database update is applied.',
        };
      }

      throw error;
    }
  }

  async createReview(userId: number, productId: number, dto: CreateReviewDto) {
    await this.ensureProductExists(productId);
    const content = dto.content.trim();
    const title = dto.title?.trim() || null;

    if (!content) {
      throw new BadRequestException('Review content cannot be empty.');
    }

    let existingReview: { id: number } | null;
    let qualifyingOrder: { id: number } | null;

    try {
      [existingReview, qualifyingOrder] = await Promise.all([
        this.prisma.review.findUnique({
          where: {
            userId_productId: {
              userId,
              productId,
            },
          },
        }),
        this.getEligibleDeliveredOrder(userId, productId),
      ]);
    } catch (error: unknown) {
      if (this.isMissingReviewTable(error)) {
        throw new BadRequestException(
          'Reviews are not available yet. Apply the latest database migration and try again.',
        );
      }

      throw error;
    }

    if (existingReview) {
      throw new ConflictException('You already reviewed this product.');
    }

    if (!qualifyingOrder) {
      throw new BadRequestException(
        'You can only review products you have purchased.',
      );
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          productId,
          orderId: qualifyingOrder.id,
          rating: dto.rating,
          title,
          content,
          status: ReviewStatus.PENDING,
        },
        include: this.reviewInclude,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        await this.emailVerificationService.sendReviewPosted(
          user.email,
          user.name,
          userId,
        );
      }

      await this.cache.del(`reviews:product:${productId}`);
      await this.cache.del('reviews:featured:6');

      return {
        ...review,
        title: review.title ? sanitizeHtml(review.title) : null,
        content: sanitizeHtml(review.content),
      };
    } catch (error: unknown) {
      if (this.isMissingReviewTable(error)) {
        throw new BadRequestException(
          'Reviews are not available yet. Apply the latest database migration and try again.',
        );
      }

      throw error;
    }
  }

  async moderateReview(
    reviewId: number,
    dto: ModerateReviewDto,
  ): Promise<{ id: number; status: ReviewStatus; adminNote: string | null }> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, status: true, adminNote: true, productId: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status:
          dto.status === 'APPROVED'
            ? ReviewStatus.APPROVED
            : ReviewStatus.REJECTED,
        adminNote: dto.adminNote ?? null,
      },
      select: { id: true, status: true, adminNote: true },
    });

    await this.cache.del(`reviews:product:${review.productId}`);
    await this.cache.del('reviews:featured:6');

    return updatedReview;
  }

  async getPendingReviews(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { status: ReviewStatus.PENDING },
        include: {
          user: {
            select: { id: true, name: true },
          },
          product: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { status: ReviewStatus.PENDING },
      }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createComment(
    userId: number,
    reviewId: number,
    dto: CreateReviewCommentDto,
  ) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Comment content cannot be empty.');
    }

    let review: { id: number; productId: number } | null;

    try {
      review = await this.prisma.review.findUnique({
        where: { id: reviewId },
        select: { id: true, productId: true },
      });
    } catch (error: unknown) {
      if (this.isMissingReviewTable(error)) {
        throw new BadRequestException(
          'Review comments are not available yet. Apply the latest database migration and try again.',
        );
      }

      throw error;
    }

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    try {
      const comment = await this.prisma.reviewComment.create({
        data: {
          reviewId,
          userId,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        await this.emailVerificationService.sendCommentPosted(
          user.email,
          user.name,
          userId,
        );
      }

      await this.cache.del(`reviews:product:${review.productId}`);

      return {
        ...comment,
        content: sanitizeHtml(comment.content),
      };
    } catch (error: unknown) {
      if (this.isMissingReviewTable(error)) {
        throw new BadRequestException(
          'Review comments are not available yet. Apply the latest database migration and try again.',
        );
      }

      throw error;
    }
  }
}
