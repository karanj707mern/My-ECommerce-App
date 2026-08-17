import { IsString, MaxLength } from 'class-validator';

export class CreateReviewCommentDto {
  @IsString()
  @MaxLength(1000)
  content!: string;
}
