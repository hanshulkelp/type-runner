import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // enables DTO validation globally on every endpoint
  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,  // strips fields not declared in the DTO
    transform:            true,  // auto-converts types
    forbidNonWhitelisted: true,  // throws error if unknown fields are sent
  }));

  app.enableCors({ origin: 'http://localhost:4200', credentials: true });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();