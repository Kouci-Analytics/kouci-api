import { MatchesRepository } from './matches.repository.js';

export class MatchesService {
  constructor(private readonly repository = new MatchesRepository()) {}

  getHealth() {
    return {
      module: 'matches' as const,
      status: 'ok' as const
    };
  }
}
