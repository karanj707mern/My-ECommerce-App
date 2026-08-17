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
import { NewArrivalService } from './new-arrival.service';
import { CreateNewArrivalDto } from './dto/create-new-arrival.dto';
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

@ApiTags('new-arrivals')
@Controller('new-arrivals')
export class NewArrivalController {
  constructor(private readonly newArrivalService: NewArrivalService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all new arrival images (admin)' })
  @ApiResponse({ status: 200, description: 'New arrival images retrieved' })
  findAll() {
    return this.newArrivalService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'List active new arrival images (public)' })
  @ApiResponse({
    status: 200,
    description: 'Active new arrival images retrieved',
  })
  findActive() {
    return this.newArrivalService.findActive();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get new arrival image by ID (admin)' })
  @ApiResponse({ status: 200, description: 'New arrival image retrieved' })
  @ApiResponse({ status: 404, description: 'New arrival image not found' })
  @ApiParam({ name: 'id', description: 'New arrival image ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.newArrivalService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create new arrival image (admin)' })
  @ApiResponse({ status: 201, description: 'New arrival image created' })
  @ApiBody({ type: CreateNewArrivalDto })
  create(@Body() dto: CreateNewArrivalDto) {
    return this.newArrivalService.create(dto);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Upload new arrival image (admin)' })
  @ApiResponse({ status: 201, description: 'New arrival image uploaded' })
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
        comingSoon: { type: 'boolean' },
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

    const result = await this.newArrivalService.uploadImage(
      file as MulterFile,
      dto,
    );
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update new arrival image (admin)' })
  @ApiResponse({ status: 200, description: 'New arrival image updated' })
  @ApiResponse({ status: 404, description: 'New arrival image not found' })
  @ApiParam({ name: 'id', description: 'New arrival image ID' })
  @ApiBody({ type: CreateNewArrivalDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNewArrivalDto,
  ) {
    return this.newArrivalService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete new arrival image (admin)' })
  @ApiResponse({ status: 204, description: 'New arrival image deleted' })
  @ApiResponse({ status: 404, description: 'New arrival image not found' })
  @ApiParam({ name: 'id', description: 'New arrival image ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.newArrivalService.remove(id);
  }
}
