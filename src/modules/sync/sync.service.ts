import { SyncRepository } from './sync.repository.js';

export class SyncService {
  constructor(private readonly repository = new SyncRepository()) {}

  getHealth() {
    return {
      module: 'sync' as const,
      status: 'ok' as const
    };
  }
}
