import { PlayersRepository } from './players.repository.js';

export class PlayersService {
  constructor(private readonly repository = new PlayersRepository()) {}

  getHealth() {
    return {
      module: 'players' as const,
      status: 'ok' as const
    };
  }
}
