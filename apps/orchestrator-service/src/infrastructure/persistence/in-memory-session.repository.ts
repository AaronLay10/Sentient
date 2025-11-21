import { GameSession, GameSessionStatus } from '@sentient/core-domain';
import { GameSessionAggregate } from '../../domain/aggregates/game-session.aggregate';
import { SessionRepository } from '../../domain/repositories/session.repository';

export class InMemorySessionRepository implements SessionRepository {
  private sessions: Map<string, GameSessionAggregate> = new Map();

  async findById(id: string): Promise<GameSessionAggregate | null> {
    return this.sessions.get(id) || null;
  }

  async save(aggregate: GameSessionAggregate): Promise<void> {
    this.sessions.set(aggregate.getSession().id, aggregate);
  }

  async findActiveByRoomId(roomId: string): Promise<GameSessionAggregate[]> {
    const activeSessions: GameSessionAggregate[] = [];

    for (const session of this.sessions.values()) {
      const sessionData = session.getSession();
      if (
        sessionData.room_id === roomId &&
        (sessionData.status === GameSessionStatus.RUNNING ||
          sessionData.status === GameSessionStatus.PAUSED)
      ) {
        activeSessions.push(session);
      }
    }

    return activeSessions;
  }
}
