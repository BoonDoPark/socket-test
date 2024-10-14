import { Module } from '@nestjs/common';
import { TalkController } from './talk.controller';
import { TalkService } from './talk.service';
import { TalkGateway } from './talk.gateway';

@Module({
  imports: [],
  controllers: [TalkController],
  providers: [TalkService, TalkGateway]
})
export class TalkModule {}
