import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule.forRoot());
  configureApp(app);
  await app.listen(Number(process.env.API_PORT ?? 3000), '127.0.0.1');
}
void bootstrap();
