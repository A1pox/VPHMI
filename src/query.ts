type StepKind = "where" | "groupBy" | "having" | "sort";

type Step<Input, Output, Kind extends StepKind> = ((data: Input[]) => Output[]) & {
  readonly kind: Kind;
};

export type Transform<T> = (data: T[]) => T[];

export type WhereStep<T> = Step<T, T, "where">;
export type SortStep<T extends object> = Step<T, T, "sort">;

export type Where<T extends object> = <K extends keyof T>(
  key: K,
  value: T[K]
) => WhereStep<T>;

export type Sort<T extends object> = <K extends keyof T>(key: K) => SortStep<T>;

export interface Group<T, K extends keyof T> {
  key: T[K];
  items: T[];
}

export type GroupByStep<T extends object, K extends keyof T> = Step<
  T,
  Group<T, K>,
  "groupBy"
>;

export type GroupBy<T extends object> = <K extends keyof T>(key: K) => GroupByStep<T, K>;

export type GroupTransform<T, K extends keyof T> = (
  groups: Group<T, K>[]
) => Group<T, K>[];

export type HavingStep<T extends object, K extends keyof T> = Step<
  Group<T, K>,
  Group<T, K>,
  "having"
>;

export type Having<T extends object> = <K extends keyof T>(
  predicate: (group: Group<T, K>) => boolean
) => HavingStep<T, K>;

type AnyStep = Step<any, any, StepKind>;
type PipelineState = "filtering" | "grouped" | "sorting";
type NonEmptySteps = [AnyStep, ...AnyStep[]];

type IsAllowed<State extends PipelineState, Kind extends StepKind> = State extends "filtering"
  ? Kind extends "where" | "groupBy" | "sort"
    ? true
    : false
  : State extends "grouped"
    ? Kind extends "having" | "sort"
      ? true
      : false
    : Kind extends "sort"
      ? true
      : false;

type NextState<State extends PipelineState, Kind extends StepKind> = Kind extends "sort"
  ? "sorting"
  : Kind extends "groupBy" | "having"
    ? "grouped"
    : State;

type CastSteps<Steps> = Steps extends AnyStep[] ? Steps : never;

type ValidateSteps<
  Current,
  Steps extends AnyStep[],
  State extends PipelineState = "filtering",
> = Steps extends []
  ? []
  : Steps extends [infer First, ...infer Rest]
    ? First extends Step<Current, infer Next, infer Kind>
      ? IsAllowed<State, Kind> extends true
        ? [First, ...ValidateSteps<Next, CastSteps<Rest>, NextState<State, Kind>>]
        : never
      : never
    : never;

type QueryResult<Current, Steps extends AnyStep[]> = Steps extends []
  ? Current[]
  : Steps extends [infer First, ...infer Rest]
    ? First extends Step<Current, infer Next, StepKind>
      ? QueryResult<Next, CastSteps<Rest>>
      : never
    : never;

type FirstInput<Steps extends NonEmptySteps> = Steps[0] extends Step<infer Input, any, StepKind>
  ? Input
  : never;

function withKind<Input, Output, Kind extends StepKind>(
  kind: Kind,
  transform: (data: Input[]) => Output[]
): Step<Input, Output, Kind> {
  return Object.assign(transform, { kind });
}

export const where = <T extends object>(): Where<T> => (key, value) =>
  withKind("where", (data: T[]) => data.filter((item) => item[key] === value));

export const sort = <T extends object>(): Sort<T> => (key) =>
  withKind("sort", (data: T[]) =>
    [...data].sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];

      if (leftValue < rightValue) {
        return -1;
      }
      if (leftValue > rightValue) {
        return 1;
      }
      return 0;
    })
  );

export const groupBy = <T extends object>(): GroupBy<T> => (key) =>
  withKind("groupBy", (data: T[]) => {
    const groups = new Map<T[keyof T], T[]>();

    for (const item of data) {
      const groupKey = item[key];
      const items = groups.get(groupKey) ?? [];
      items.push(item);
      groups.set(groupKey, items);
    }

    return Array.from(groups.entries()).map(([groupKey, items]) => ({
      key: groupKey as T[typeof key],
      items: [...items],
    }));
  });

export const having = <T extends object>(): Having<T> => (predicate) =>
  withKind("having", (groups) => groups.filter(predicate));

export function query<T extends object>(): Transform<T>;
export function query<Steps extends NonEmptySteps>(
  ...steps: Steps & ValidateSteps<FirstInput<Steps>, Steps>
): (data: FirstInput<Steps>[]) => QueryResult<FirstInput<Steps>, Steps>;
export function query(...steps: AnyStep[]) {
  return (data: any[]) => steps.reduce<any[]>((result, step) => step(result), data);
}
