import { TelemetryRepository } from './telemetry.repository.js';

export class TelemetryService {
  constructor(private readonly repository = new TelemetryRepository()) {}

  getHealth() {
    return {
      module: 'telemetry' as const,
      status: 'ok' as const
    };
  }
}
