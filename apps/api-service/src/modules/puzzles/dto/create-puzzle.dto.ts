import { IsString, IsOptional, IsObject, IsBoolean, IsInt, Min } from 'class-validator';

export class CreatePuzzleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }>;
  };

  @IsOptional()
  @IsInt()
  @Min(0)
  timeout_seconds?: number;

  @IsOptional()
  @IsString()
  hint_text?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
