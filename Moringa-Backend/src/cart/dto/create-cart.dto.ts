import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateCartDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
