import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidateNested,
} from 'class-validator';
import { Phase, Status, VizType } from '@ct-agent/shared';

function IsEndYearAfterStartYear(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEndYearAfterStartYear',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const filters = args.object as FiltersDto;
          if (value === undefined || filters.start_year === undefined) return true;
          return typeof value === 'number' && filters.start_year <= value;
        },
      },
    });
  };
}

class FiltersDto {
  @IsOptional() @IsString() @MinLength(1) condition?: string;
  @IsOptional() @IsString() @MinLength(1) drug_name?: string;
  @IsOptional() @IsString() @MinLength(1) sponsor?: string;
  @IsOptional() @IsString() @MinLength(1) country?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(Phase, { each: true })
  phase?: Phase[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(Status, { each: true })
  status?: Status[];

  @IsOptional() @IsInt() @Min(1900) @Max(2100) start_year?: number;
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsEndYearAfterStartYear({
    message: 'end_year must be greater than or equal to start_year',
  })
  end_year?: number;
}

class OptionsDto {
  @IsOptional() @IsInt() @Min(10) @Max(1000) max_studies?: number;
  @IsOptional() @IsBoolean() include_citations?: boolean;
  @IsOptional() @IsEnum(VizType) preferred_viz?: VizType;
}

export class QueryRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  query!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersDto)
  filters?: FiltersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsDto)
  options?: OptionsDto;
}
