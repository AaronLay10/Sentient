import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPuzzlesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 100;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;
}
