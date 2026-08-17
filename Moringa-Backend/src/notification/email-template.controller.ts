import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RolesGuard } from '@/auth/rolesguard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AuditLog } from '@/audit/audit-logger.decorator';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { EmailTemplateService } from './email-template.service';

@ApiTags('Email Templates')
@Controller('notification/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@UseInterceptors(AuditInterceptor)
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List all email templates (admin)' })
  findAll() {
    return this.emailTemplateService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single email template by id (admin)' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.emailTemplateService.getById(id);
  }

  @Post()
  @AuditLog('CREATE', 'EmailTemplate')
  @ApiOperation({ summary: 'Create a new email template (admin)' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  create(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.create(dto);
  }

  @Patch(':id')
  @AuditLog('UPDATE', 'EmailTemplate')
  @ApiOperation({ summary: 'Update an existing email template (admin)' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplateService.update(id, dto);
  }

  @Delete(':id')
  @AuditLog('DELETE', 'EmailTemplate')
  @ApiOperation({ summary: 'Delete an email template (admin)' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.emailTemplateService.delete(id);
  }
}
