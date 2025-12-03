import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateRoomDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'room_id must be lowercase alphanumeric with hyphens/underscores only'
  })
  room_id?: string;
}
