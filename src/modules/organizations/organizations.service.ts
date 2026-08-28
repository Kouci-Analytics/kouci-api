import { OrganizationsRepository } from './organizations.repository.js';

export class OrganizationsService {
  constructor(private readonly repository = new OrganizationsRepository()) {}

  getHealth() {
    return {
      module: 'organizations' as const,
      status: 'ok' as const
    };
  }
}
