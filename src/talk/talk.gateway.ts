import { Logger } from '@nestjs/common';
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { createClient } from 'redis';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(3000, {
  namespace: 'talk',
  cors: { origin: '*' }
})
export class TalkGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private redisClient = createClient({ url: 'redis://localhost:6379' });
  private logger: Logger = new Logger('TalkGateway');

  constructor() {
    // Redis 클라이언트 연결
    this.redisClient.connect().catch(err => this.logger.error(`Failed to connect to Redis: ${err}`));
  }

  @WebSocketServer() server: Server;

  handleDisconnect(client: Socket) {
    try {
      this.logger.log('disconnection socket')
    } catch(error) {
      throw new Error(error);
    }
  }

  handleConnection(client: Socket, ...args: any[]) {
    try {
      this.logger.log('connection socket')
    } catch(error) {
      throw new Error(error);
    }
  }

  afterInit(server: Server) {
    try {
      this.logger.log('initialize server');
    } catch(error) {
      throw new Error(error);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() roomId: number, client: Socket): Promise<void> {
    this.logger.log(client, roomId);
    // 클라이언트를 특정 채팅방에 가입
    client.join(`${roomId}`);

    // Redis에서 해당 채팅방의 모든 메시지를 가져와 클라이언트에 전송
    this.redisClient.lRange(`messages:${roomId}`, 0, -1)
      .then(messages => {
        messages.forEach(message => {
          client.emit('messages', message);
        });
      })
      .catch(err => this.logger.error(`Failed to fetch messages from Redis for room ${roomId}: ${err}`));
  }
  
  @SubscribeMessage('messages')
  async handleMessage(@MessageBody() { roomId, data }: { roomId: number; data: string }, client: Socket): Promise<void> {
    this.logger.log(`Received message: ${data}`);
    await this.redisClient.rPush(`messages:${roomId}`, data);
    this.server.to(`${roomId}`).emit('messages', data);
  }
}
