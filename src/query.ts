export type Transform<T> = (data: T[]) => T[];

export type Where<T extends object> = <K extends keyof T>(
  key: K,
  value: T[K]
) => Transform<T>;

export type Sort<T extends object> = <K extends keyof T>(key: K) => Transform<T>;

export interface Group<T, K extends keyof T> {
  key: T[K];
  items: T[];
}

export type GroupBy<T extends object> = <K extends keyof T>(
  key: K
) => (data: T[]) => Group<T, K>[];

export type GroupTransform<T, K extends keyof T> = (
  groups: Group<T, K>[]
) => Group<T, K>[];

export type Having<T extends object> = <K extends keyof T>(
  predicate: (group: Group<T, K>) => boolean
) => GroupTransform<T, K>;

type GroupingStep<T extends object, K extends keyof T> = (
  data: T[]
) => Group<T, K>[];

type PipelineStep = (data: any[]) => any[];

export const where = <T extends object>(): Where<T> => (key, value) => (data) =>
  data.filter((item) => item[key] === value);

export const sort = <T extends object>(): Sort<T> => (key) => (data) =>
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
  });

export const groupBy = <T extends object>(): GroupBy<T> => (key) => (data) => {
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
};

export const having = <T extends object>(): Having<T> => (predicate) => (groups) =>
  groups.filter(predicate);

export function query<T>(): Transform<T>;
export function query<T>(...steps: Transform<T>[]): Transform<T>;
export function query<T extends object, K extends keyof T>(
  groupStep: GroupingStep<T, K>,
  ...groupSteps: GroupTransform<T, K>[]
): (data: T[]) => Group<T, K>[];
export function query<T extends object, K extends keyof T>(
  step1: Transform<T>,
  groupStep: GroupingStep<T, K>,
  ...groupSteps: GroupTransform<T, K>[]
): (data: T[]) => Group<T, K>[];
export function query<T extends object, K extends keyof T>(
  step1: Transform<T>,
  step2: Transform<T>,
  groupStep: GroupingStep<T, K>,
  ...groupSteps: GroupTransform<T, K>[]
): (data: T[]) => Group<T, K>[];
export function query<T extends object, K extends keyof T>(
  step1: Transform<T>,
  step2: Transform<T>,
  step3: Transform<T>,
  groupStep: GroupingStep<T, K>,
  ...groupSteps: GroupTransform<T, K>[]
): (data: T[]) => Group<T, K>[];
export function query(...steps: PipelineStep[]) {
  return (data: any[]) => steps.reduce<any[]>((result, step) => step(result), data);
}
