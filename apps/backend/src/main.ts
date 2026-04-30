import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const configService = app.get(ConfigService);
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pillyway API')
    .setDescription('Pilgrimage route planning API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  console.log(
    '********* Swagger docs available at ',
    configService.get<string>('FRONTEND_URL') + '/api/docs *********',
  );

  await app.listen(configService.get<number>('PORT') ?? 3001);
}

void bootstrap();
