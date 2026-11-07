import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // frontend gọi /api/...
  app.enableCors({ origin: true }); // dev đã có proxy Vite; bật thêm cho lúc deploy
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`API chạy tại http://localhost:${port}/api`);
}
bootstrap();
