import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RefundOrderDto {
  @IsOptional()
  @IsBoolean()
  manual?: boolean;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
