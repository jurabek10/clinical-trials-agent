import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryRequestDto } from '../src/query/dto/query-request.dto';

describe('QueryRequestDto', () => {
  it('rejects an end_year earlier than start_year', async () => {
    const dto = plainToInstance(QueryRequestDto, {
      query: 'How has the number of trials changed per year?',
      filters: {
        start_year: 2025,
        end_year: 2020,
      },
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    const filterErrors = errors.find((e) => e.property === 'filters')?.children ?? [];
    const endYearError = filterErrors.find((e) => e.property === 'end_year');

    expect(endYearError?.constraints).toMatchObject({
      isEndYearAfterStartYear: 'end_year must be greater than or equal to start_year',
    });
  });

  it('accepts a valid year range', async () => {
    const dto = plainToInstance(QueryRequestDto, {
      query: 'How has the number of trials changed per year?',
      filters: {
        start_year: 2020,
        end_year: 2025,
      },
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
