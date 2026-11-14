import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { MeController } from './auth/me.controller';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { APP_CONFIG, loadConfig, type AppConfig } from './config';
import { DatabaseService } from './db/database.service';
import { HealthController } from './health.controller';
import { TenantContext } from './tenant/tenant-context';
import { TenantInterceptor } from './tenant/tenant.interceptor';

@Module({})
export class AppModule {
  static forRoot(overrides: Partial<AppConfig> = {}): DynamicModule {
    const config = loadConfig(overrides);
    return {
      module: AppModule,
      global: true,
      imports: [JwtModule.register({ secret: config.jwtSecret, signOptions: { algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } })],
      controllers: [HealthController, AuthController, MeController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        DatabaseService,
        TenantContext,
        AuthService,
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
      exports: [DatabaseService, TenantContext, APP_CONFIG],
    };
  }
}
