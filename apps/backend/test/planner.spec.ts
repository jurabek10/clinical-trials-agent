import { ConfigService } from '@nestjs/config';
import { PlannerService } from '../src/planner/planner.service';

type FakeCompletion = { choices: { message: { content: string } }[] };

class FakeClient {
  public calls: unknown[] = [];
  constructor(private responses: string[]) {}
  chat = {
    completions: {
      create: async (args: unknown): Promise<FakeCompletion> => {
        this.calls.push(args);
        const next = this.responses.shift();
        if (next === undefined) throw new Error('No more fake responses');
        return { choices: [{ message: { content: next } }] };
      },
    },
  };
}

function makeConfig(): ConfigService {
  return {
    getOrThrow: (key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      throw new Error(`unknown config key ${key}`);
    },
    get: <T>(_key: string, fallback?: T) => fallback,
  } as unknown as ConfigService;
}

const validPlan = JSON.stringify({
  intent: 'distribution',
  primary_entity: { type: 'drug', value: 'Pembrolizumab' },
  group_by: ['phase'],
  filters: {
    condition: null,
    drug_name: 'Pembrolizumab',
    sponsor: null,
    country: null,
    phase: [],
    status: [],
    start_year: null,
    end_year: null,
  },
  suggested_viz: 'bar_chart',
  title_hint: 'Pembrolizumab trials by phase',
  interpretation: 'Count Pembrolizumab trials by phase.',
});

const invalidPlanShape = JSON.stringify({
  intent: 'distribution',
  primary_entity: { type: 'drug', value: 'X' },
  // missing group_by → should fail Zod
  filters: {},
  suggested_viz: 'bar_chart',
  title_hint: 'X',
  interpretation: 'Count X.',
});

describe('PlannerService', () => {
  function makeService(responses: string[]): { svc: PlannerService; fake: FakeClient } {
    const svc = new PlannerService(makeConfig());
    const fake = new FakeClient(responses);
    // Inject fake client
    (svc as unknown as { client: FakeClient }).client = fake;
    return { svc, fake };
  }

  it('returns a parsed plan when LLM output is valid', async () => {
    const { svc } = makeService([validPlan]);
    const plan = await svc.plan('How are pembrolizumab trials distributed across phases?');
    expect(plan.intent).toBe('distribution');
    expect(plan.suggested_viz).toBe('bar_chart');
    expect(plan.primary_entity.value).toBe('Pembrolizumab');
  });

  it('uses OpenAI strict json_schema mode for the call', async () => {
    const { svc, fake } = makeService([validPlan]);
    await svc.plan('test');
    const args = fake.calls[0] as {
      response_format: {
        type: string;
        json_schema: { name: string; strict: boolean; schema: Record<string, unknown> };
      };
    };
    expect(args.response_format.type).toBe('json_schema');
    expect(args.response_format.json_schema.strict).toBe(true);
    expect(args.response_format.json_schema.name).toBe('query_plan');
    expect(args.response_format.json_schema.schema.type).toBe('object');
  });

  it('retries once on invalid output, succeeds on second try', async () => {
    const { svc, fake } = makeService([invalidPlanShape, validPlan]);
    const plan = await svc.plan('test');
    expect(plan.intent).toBe('distribution');
    expect(fake.calls.length).toBe(2);
  });

  it('throws PLAN_VALIDATION_FAILED after two invalid attempts', async () => {
    const { svc } = makeService([invalidPlanShape, invalidPlanShape]);
    await expect(svc.plan('test')).rejects.toMatchObject({
      response: { error: { code: 'PLAN_VALIDATION_FAILED' } },
    });
  });

  it('throws PLAN_VALIDATION_FAILED when output is not JSON', async () => {
    const { svc } = makeService(['this is not json at all', 'still not json']);
    await expect(svc.plan('test')).rejects.toMatchObject({
      response: { error: { code: 'PLAN_VALIDATION_FAILED' } },
    });
  });
});
