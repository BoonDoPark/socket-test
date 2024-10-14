import { Module } from '@nestjs/common';
import { TalkModule } from './talk/talk.module';

@Module({
  imports: [TalkModule],
})
export class AppModule {}
