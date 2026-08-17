import { IsString, IsOptional } from 'class-validator';

export class MergeGuestCartDto {
  @IsString()
  @IsOptional()
  token?: string;
}
