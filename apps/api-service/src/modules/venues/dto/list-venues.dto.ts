import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListVenuesDto extends PaginationQueryDto {
  // Explicitly allow all pagination fields to be optional
  // This prevents 400 errors when no query params are sent
}
