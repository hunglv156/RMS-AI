import { Controller, Get } from '@nestjs/common';
import type { Health } from '@rms/contracts';
import { Public } from './auth/decorators';

@Controller('health')
export class HealthController {
  @Public() @Get()
  check(): Health {
    return { status: 'ok' };
  }
}
