import { DevicesRepository } from './devices.repository.js';

export class DevicesService {
  constructor(private readonly repository = new DevicesRepository()) {
    this.repository = repository;
  }

  getHealth() {
    return {
      module: 'devices' as const,
      status: 'ok' as const
    };
  }
}
