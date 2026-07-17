import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAdminAccountDto {
  @IsString()
  @Length(3, 100)
  @Matches(/^[A-Za-z0-9._-]+$/)
  loginId: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(8, 200)
  password: string;
}

export class UpdateAdminAccountDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  @Matches(/^[A-Za-z0-9._-]+$/)
  loginId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAdminPasswordDto {
  @IsString()
  @Length(8, 200)
  password: string;
}
