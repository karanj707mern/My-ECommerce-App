import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'The user password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: 'CAPTCHA ID from the CAPTCHA generation endpoint',
    example: 'abc123def456',
  })
  @IsString()
  @MinLength(1)
  captchaId!: string;

  @ApiProperty({
    description: 'CAPTCHA input text from the user',
    example: 'X7K9P2',
  })
  @IsString()
  @MinLength(1)
  captchaInput!: string;
}
