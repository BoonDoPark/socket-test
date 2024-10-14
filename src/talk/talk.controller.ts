import { Controller, Get } from '@nestjs/common';

@Controller('talk')
export class TalkController {
    
    @Get()
    async test() {
        return 'hello world';
    }
}
