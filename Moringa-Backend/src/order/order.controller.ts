import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  MessageEvent,
  ParseIntPipe,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/rolesguard';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderIssueDto } from './dto/create-order-issue.dto';
import { UpdateOrderIssueDto } from './dto/update-order-issue.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { QueryOrderDto } from './dto/query-order.dto';
import { Role } from '@prisma/client';

@ApiTags('orders')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Stream orders via SSE' })
  @ApiResponse({ status: 200, description: 'Order stream established' })
  streamOrders(
    @Req() req: Request & { user: { id: number; role: Role } },
  ): Observable<MessageEvent> {
    const stream =
      req.user.role === Role.ADMIN
        ? this.orderService.streamAdminOrders()
        : this.orderService.streamOrders(req.user.id);

    return stream.pipe(
      map((data) => ({
        data,
      })),
    );
  }

  @Post('webhook/razorpay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  handleRazorpayWebhook(
    @Req()
    req: Request & { rawBody?: Buffer | string },
  ) {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody;

    return this.orderService.handleRazorpayWebhook(rawBody, signature);
  }

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify Razorpay payment' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  verifyPayment(
    @Req() req: Request & { user: { id: number } },
    @Body()
    body: {
      orderId: number;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      body;
    if (
      !orderId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      throw new BadRequestException('Missing payment verification data');
    }

    return this.orderService.verifyPayment(
      req.user.id,
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiOperation({ summary: 'Create Razorpay checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiBody({ type: CreateOrderDto })
  createCheckoutSession(
    @Req() req: Request & { user: { id: number } },
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.createCheckoutSession(req.user.id, createOrderDto);
  }

  @Post('preview')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Preview checkout without creating order' })
  @ApiResponse({ status: 200, description: 'Checkout preview' })
  @ApiBody({ type: CreateOrderDto })
  preview(
    @Req() req: Request & { user: { id: number } },
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.previewCheckout(req.user.id, createOrderDto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiBody({ type: CreateOrderDto })
  create(
    @Req() req: Request & { user: { id: number } },
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.create(req.user.id, createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get all orders for current user with pagination and filters',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: ['createdAt', 'total', 'status'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  findAll(
    @Req() req: Request & { user: { id: number } },
    @Query() query: QueryOrderDto,
  ) {
    return this.orderService.findAllWithQuery(req.user.id, query);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get all orders with pagination, filters, and sorting (admin)',
  })
  @ApiResponse({ status: 200, description: 'All orders retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: ['createdAt', 'total', 'status'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  findAdminOrders(@Query() query: QueryOrderDto) {
    return this.orderService.findAdminOrders(query);
  }

  @Get('admin/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="orders.csv"')
  @ApiOperation({ summary: 'Export orders as CSV (admin)' })
  @ApiResponse({
    status: 200,
    description: 'CSV export',
    content: { 'text/csv': {} },
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: ['createdAt', 'total', 'status'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
  })
  exportOrders(@Query() query: QueryOrderDto): Promise<string> {
    return this.orderService.exportOrders(query);
  }

  @Get('admin/open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get open orders (admin)' })
  @ApiResponse({ status: 200, description: 'Open orders retrieved' })
  findOpenOrders() {
    return this.orderService.findOpenOrders();
  }

  @Get('admin/cancelled')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get cancelled orders (admin)' })
  @ApiResponse({ status: 200, description: 'Cancelled orders retrieved' })
  findCancelledOrders() {
    return this.orderService.findCancelledOrders();
  }

  @Get('admin/issues')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get order issues (admin)' })
  @ApiResponse({ status: 200, description: 'Order issues retrieved' })
  findAdminIssues() {
    return this.orderService.findAdminIssues();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved' })
  findOne(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.findOne(req.user.id, id);
  }

  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order invoice' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved' })
  getInvoice(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getInvoice(req.user.id, id);
  }

  @Post(':id/issues')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create order issue' })
  @ApiResponse({ status: 201, description: 'Issue created' })
  @ApiBody({ type: CreateOrderIssueDto })
  createIssue(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() createOrderIssueDto: CreateOrderIssueDto,
  ) {
    return this.orderService.createIssue(req.user.id, id, createOrderIssueDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update order (admin)' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  @ApiBody({ type: UpdateOrderDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Patch('issues/:issueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update order issue (admin)' })
  @ApiResponse({ status: 200, description: 'Issue updated' })
  @ApiBody({ type: UpdateOrderIssueDto })
  updateIssue(
    @Param('issueId', ParseIntPipe) issueId: number,
    @Body() updateOrderIssueDto: UpdateOrderIssueDto,
  ) {
    return this.orderService.updateIssue(issueId, updateOrderIssueDto);
  }

  @Post('admin/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Refund a cancelled order (admin)' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  @ApiResponse({ status: 400, description: 'Order cannot be refunded' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiBody({ type: RefundOrderDto })
  refundOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() refundOrderDto: RefundOrderDto,
  ) {
    return this.orderService.refundOrder(id, {
      manual: refundOrderDto.manual,
      method: refundOrderDto.method,
      reference: refundOrderDto.reference,
      notes: refundOrderDto.notes,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 204, description: 'Order deleted' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.remove(req.user.id, id);
  }
}
