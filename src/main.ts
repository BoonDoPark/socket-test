import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RedisIOAdapter } from './talk/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("/api/v1");
  app.enableCors({origin: '*'})

  const redisIOAdapter = new RedisIOAdapter(app);
  await redisIOAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIOAdapter);
  await app.listen(3030);
}
bootstrap();
