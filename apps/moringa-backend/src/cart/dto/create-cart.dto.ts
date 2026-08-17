import { IsNumber, Min, IsOptional } from 'class-validator';

export class CreateCartDto {
  @IsNumber()
  productId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}
