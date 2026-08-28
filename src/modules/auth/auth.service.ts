import { AuthRepository } from './auth.repository.js';

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  getHealth() {
    return {
      module: 'auth' as const,
      status: 'ok' as const
    };
  }
}
