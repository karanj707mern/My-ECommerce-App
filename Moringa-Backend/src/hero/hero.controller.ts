import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/rolesguard';
import { HeroService } from './hero.service';
import { CreateHeroImageDto } from './dto/create-hero-image.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { File as MulterFile } from 'multer';

const allowedImageMimeTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

@ApiTags('hero')
@Controller('hero')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all hero images (admin)' })
  @ApiResponse({ status: 200, description: 'Hero images retrieved' })
  findAll() {
    return this.heroService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'List active hero images (public)' })
  @ApiResponse({ status: 200, description: 'Active hero images retrieved' })
  findActive() {
    return this.heroService.findActive();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get hero image by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Hero image retrieved' })
  @ApiResponse({ status: 404, description: 'Hero image not found' })
  @ApiParam({ name: 'id', description: 'Hero image ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.heroService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create hero image (admin)' })
  @ApiResponse({ status: 201, description: 'Hero image created' })
  @ApiBody({ type: CreateHeroImageDto })
  create(@Body() dto: CreateHeroImageDto) {
    return this.heroService.create(dto);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Upload hero image (admin)' })
  @ApiResponse({ status: 201, description: 'Hero image uploaded' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        alt: { type: 'string' },
        sortOrder: { type: 'integer' },
        active: { type: 'boolean' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(), // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      fileFilter: (_req, file, callback) => {
        const mimeType = file.mimetype;
        if (!(mimeType in allowedImageMimeTypes)) {
          callback(
            new BadRequestException(
              'Only JPG, PNG, WEBP, AVIF, and GIF images are allowed.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: unknown,
    @Body() dto: Record<string, unknown>,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const result = await this.heroService.uploadImage(file as MulterFile, dto);
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update hero image (admin)' })
  @ApiResponse({ status: 200, description: 'Hero image updated' })
  @ApiResponse({ status: 404, description: 'Hero image not found' })
  @ApiParam({ name: 'id', description: 'Hero image ID' })
  @ApiBody({ type: CreateHeroImageDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateHeroImageDto,
  ) {
    return this.heroService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete hero image (admin)' })
  @ApiResponse({ status: 204, description: 'Hero image deleted' })
  @ApiResponse({ status: 404, description: 'Hero image not found' })
  @ApiParam({ name: 'id', description: 'Hero image ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.heroService.remove(id);
  }
}
