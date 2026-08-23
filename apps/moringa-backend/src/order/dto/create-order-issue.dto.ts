import { IsIn, IsString, MinLength } from 'class-validator';

export const ORDER_ISSUE_TYPES = [
  'RETURN',
  'REFUND',
  'REPLACEMENT',
  'DISPUTE',
  'SHIPMENT_EXCEPTION',
] as const;

export type OrderIssueTypeValue = (typeof ORDER_ISSUE_TYPES)[number];

export class CreateOrderIssueDto {
  @IsIn(ORDER_ISSUE_TYPES)
  type!: OrderIssueTypeValue;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;
}
