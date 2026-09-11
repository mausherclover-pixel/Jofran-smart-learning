import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AccessTokenClaims } from '../auth/token.service';

// The room key is `user:{userId}` (architecture §08). Authenticates with the
// same short-lived access token as REST — a socket is dropped, not kept
// alive, once that token expires, forcing the same 15-minute refresh
// discipline as the HTTP path.
@WebSocketGateway({ namespace: 'notifications', cors: { origin: true, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new UnauthorizedException();

      const claims = this.jwt.verify<AccessTokenClaims>(token, {
        secret: this.config.get<string>('auth.accessSecret'),
      });
      client.join(`user:${claims.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  /** Called by the notification-fanout worker for the PUSH channel. Cross-instance fanout needs the Redis adapter registered in main.ts. */
  pushToUser(userId: string, event: { title: string; body: string; templateKey: string }) {
    this.server.to(`user:${userId}`).emit('notification', event);
  }
}
