import { ClubsRepository } from './clubs.repository.js';

export class ClubsService {
  constructor(private readonly repository = new ClubsRepository()) {}

  getHealth() {
    return {
      module: 'clubs' as const,
      status: 'ok' as const
    };
  }
}
