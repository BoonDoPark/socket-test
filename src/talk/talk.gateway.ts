import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { 
  MessageBody, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  OnGatewayInit, 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer 
} from '@nestjs/websockets';
import { createClient } from 'redis';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(4000, {
  namespace: 'talk',
  cors: { origin: '*' }
})
export class TalkGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private redisClient = createClient({ url: 'redis://localhost:6379' });
  private logger: Logger = new Logger('TalkGateway');

  @WebSocketServer() 
  server: Server;

  constructor() {
    // Redis 클라이언트 연결
    this.redisClient.connect().catch(err => this.logger.error(`Failed to connect to Redis: ${err}`));
  }

  private connectedClients = [];
  private rooms: { [key: string]: any[] } = {};

  async handleConnection(client: Socket): Promise<void> {
    try {
      await this.logger.log('connection socket');
      const socketId = client.id;
      this.addClient(socketId);
    } catch(error) {
      throw new Error(error);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    try {
      this.logger.log('disconnection socket');
      this.removeClient(client.id);
      const clientInfo = await JSON.parse(await this.redisClient.get(client.id));
      if (clientInfo != undefined) {
        await this.redisClient.del(client.id);
        const clientId = clientInfo['id'];
        const result = { status: 'off_line', id: clientId}
        this.server.emit('client_info', result);
      }
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

  @SubscribeMessage('login')
  async loginClient(client: Socket, clientId: string): Promise<void> {
    if (clientId == '' && clientId == undefined)
      throw new UnauthorizedException();
    await this.redisClient.set(client.id, JSON.stringify({ id: clientId, status: 'online' }));
    const clientInfo = await JSON.parse(await this.redisClient.get(client.id));
    const result = { status: clientInfo.status, id: clientId };
    this.server.emit('client_info', result);
  }

  @SubscribeMessage('logout')
  async logoutClient(client: Socket, id: string): Promise<void> {
    if (id == '' && id == undefined)
      throw new NotFoundException();
    await this.redisClient.del(client.id);
    const result = { status: 'off_line', id};
    this.server.emit('client_info', result);
  }

  @SubscribeMessage('updateStatus')
  async updateStatus(client: Socket, data: any): Promise<void> {
    if(!data)
      throw new NotFoundException();
    const clientInfo = await JSON.parse(await this.redisClient.get(client.id));
    if (clientInfo != undefined) {
      const status = data['status'];
      const updateInfo = await JSON.parse(await this.redisClient.get(client.id));
      if (clientInfo) {
        updateInfo.status = status;
        await this.redisClient.set(client.id, JSON.stringify(updateInfo.status));
      }
      const updateCleintInfo = await JSON.parse(await this.redisClient.get(client.id));
      this.server.emit('update_info', updateCleintInfo);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, room: string): Promise<void> {
    if (!this.rooms[room]) {
      this.rooms[room] = [];
    }
    this.rooms[room].push(client.id);
    client.join(room);
    client.emit("join_room", "방에 입장하셨습니다.");
  }
  
  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, data: { room: string; message: string }): Promise<void> {
    const { room, message } = data;
    this.server.to(room).emit('receive_message', {
      message: message,
      sender: client.id
    });
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(client: Socket, room: string): Promise<void> {
    if(this.rooms[room]) {
      this.rooms[room] = this.rooms[room].filter(id => id !== client.id);
    }
    client.leave(room);
    client.emit('leave_room', '방에서 나갔습니다.');
  }

  addClient(client: any) {
    this.connectedClients.push(client);
  }

  removeClient(client: any) {
    const index = this.connectedClients.indexOf(client);
    if (index !== -1) {
      this.connectedClients.splice(index, 1);
    }
  }
}
