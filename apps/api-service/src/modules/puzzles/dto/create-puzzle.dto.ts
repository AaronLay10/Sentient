import { IsString, IsOptional, IsObject, IsBoolean, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class GraphNodeData {
  [key: string]: any;
}

class GraphNode {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsObject()
  position: { x: number; y: number };

  @IsObject()
  @Type(() => GraphNodeData)
  data: Record<string, any>;
}

class GraphEdge {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string | null;

  @IsOptional()
  @IsString()
  targetHandle?: string | null;
}

class PuzzleGraph {
  @IsArray()
  @Type(() => GraphNode)
  nodes: GraphNode[];

  @IsArray()
  @Type(() => GraphEdge)
  edges: GraphEdge[];
}

export class CreatePuzzleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @Type(() => PuzzleGraph)
  graph: PuzzleGraph;

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
