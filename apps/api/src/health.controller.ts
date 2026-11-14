import { Controller, Get } from '@nestjs/common';
import type { Health } from '@rms/contracts';

@Controller('health')
export class HealthController {
  @Get()
  check(): Health {
    return { status: 'ok' };
  }
}
