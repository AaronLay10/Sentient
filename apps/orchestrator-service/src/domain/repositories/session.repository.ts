import { GameSession } from '@sentient/core-domain';
import { GameSessionAggregate } from '../aggregates/game-session.aggregate';

export interface SessionRepository {
  findById(id: string): Promise<GameSessionAggregate | null>;
  save(aggregate: GameSessionAggregate): Promise<void>;
  findActiveByRoomId(roomId: string): Promise<GameSessionAggregate[]>;
}
