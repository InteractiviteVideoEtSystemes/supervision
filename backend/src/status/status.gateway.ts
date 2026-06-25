import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/ws/status',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class StatusGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    const environment = typeof client.handshake.query.env === 'string' ? client.handshake.query.env : 'preprod';
    client.join(environment);
  }

  emitStatusUpdate(environment: string, payload: unknown): void {
    this.server.to(environment).emit('status-update', payload);
  }
}
