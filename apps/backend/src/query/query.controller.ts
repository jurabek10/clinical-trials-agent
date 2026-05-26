import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryRequestDto } from './dto/query-request.dto';
import type { QueryResponse } from '@ct-agent/shared';

@Controller('api')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('query')
  @HttpCode(200)
  async handle(@Body() body: QueryRequestDto): Promise<QueryResponse> {
    return this.queryService.run(body);
  }
}
