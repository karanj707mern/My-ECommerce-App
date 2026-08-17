import { Equals, IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @MinLength(6, { message: 'Password is required to delete your account' })
  password!: string;

  @IsString()
  @Equals('DELETE', {
    message: 'Please type DELETE to confirm account deletion',
  })
  confirmation!: string;
}
