import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health(): { status: 'ok'; service: string; time: string } {
    return {
      status: 'ok',
      service: 'ct-agent-backend',
      time: new Date().toISOString(),
    };
  }
}
