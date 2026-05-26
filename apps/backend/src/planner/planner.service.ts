import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QueryPlanSchema, type QueryPlan } from '@ct-agent/shared';
import { planValidationFailed, upstreamFailure } from '../common/errors';
import { PLANNER_SYSTEM_PROMPT } from './prompts/system-prompt';
import { FEW_SHOT_EXAMPLES } from './prompts/few-shot-examples';
import { QUERY_PLAN_JSON_SCHEMA } from './schemas/query-plan.json-schema';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
    this.model = this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    this.client = new OpenAI({ apiKey });
  }

  async plan(userQuery: string): Promise<QueryPlan> {
    const baseMessages = this.buildBaseMessages(userQuery);

    const firstRaw = await this.callOpenAI(baseMessages);
    const first = this.tryParse(firstRaw);
    if (first.success) return first.data;

    this.logger.warn(`Plan failed first validation: ${first.errorSummary}`);

    const retryMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...baseMessages,
      { role: 'assistant', content: firstRaw },
      {
        role: 'user',
        content:
          `Your previous output failed validation with these errors:\n${first.errorSummary}\n\n` +
          `Reply again with a single JSON object that fully matches the schema. No prose.`,
      },
    ];

    const secondRaw = await this.callOpenAI(retryMessages);
    const second = this.tryParse(secondRaw);
    if (second.success) return second.data;

    this.logger.warn(`Plan failed second validation: ${second.errorSummary}`);
    throw planValidationFailed(
      'LLM produced an invalid query plan after one retry.',
      { errors: second.errorSummary, raw: secondRaw },
    );
  }

  private buildBaseMessages(userQuery: string): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
    ];
    for (const ex of FEW_SHOT_EXAMPLES) {
      messages.push({ role: 'user', content: ex.user });
      messages.push({ role: 'assistant', content: JSON.stringify(ex.plan) });
    }
    messages.push({ role: 'user', content: userQuery });
    return messages;
  }

  private async callOpenAI(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
  ): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'query_plan',
            strict: true,
            schema: QUERY_PLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
          },
        },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('OpenAI returned empty content');
      return content;
    } catch (err) {
      if (err instanceof Error) {
        throw upstreamFailure(`OpenAI call failed: ${err.message}`);
      }
      throw upstreamFailure('OpenAI call failed with unknown error');
    }
  }

  private tryParse(
    raw: string,
  ): { success: true; data: QueryPlan } | { success: false; errorSummary: string } {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      return {
        success: false,
        errorSummary: `Output was not valid JSON: ${(err as Error).message}`,
      };
    }
    const parsed = QueryPlanSchema.safeParse(json);
    if (parsed.success) return { success: true, data: parsed.data };
    const errorSummary = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return { success: false, errorSummary };
  }
}
