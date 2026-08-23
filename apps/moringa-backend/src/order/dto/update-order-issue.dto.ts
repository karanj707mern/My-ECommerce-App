import { IsIn, IsOptional, IsString } from 'class-validator';

export const ORDER_ISSUE_STATUSES = [
  'OPEN',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'RESOLVED',
  'CANCELLED',
] as const;

export type OrderIssueStatusValue = (typeof ORDER_ISSUE_STATUSES)[number];

export class UpdateOrderIssueDto {
  @IsOptional()
  @IsIn(ORDER_ISSUE_STATUSES)
  status?: OrderIssueStatusValue;

  @IsOptional()
  @IsString()
  adminResponse?: string;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}
