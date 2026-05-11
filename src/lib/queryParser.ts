import { Prisma } from '@prisma/client';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterValue {
  eq?: string | number | boolean;
  neq?: string | number | boolean;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  in?: string[] | number[];
}

/**
 * Parse pagination parameters from query string
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  return { page, limit };
}

/**
 * Parse sort parameters from query string
 */
export function parseSort(
  query: Record<string, unknown>,
  allowedFields: string[],
  defaultSort: string = 'createdAt',
): SortParams {
  const sortBy = allowedFields.includes(String(query.sortBy)) ? String(query.sortBy) : defaultSort;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
}

/**
 * Build a Prisma where clause from filters
 */
export function buildWhereClause<T extends Record<string, unknown>>(
  filters: Record<string, FilterValue | string | number | boolean | undefined>,
): T {
  const where = {} as T;

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      const filterValue = value as FilterValue;
      const conditions: Record<string, unknown> = {};

      if (filterValue.eq !== undefined) conditions.equals = filterValue.eq;
      if (filterValue.neq !== undefined) conditions.not = filterValue.neq;
      if (filterValue.gt !== undefined) conditions.gt = filterValue.gt;
      if (filterValue.gte !== undefined) conditions.gte = filterValue.gte;
      if (filterValue.lt !== undefined) conditions.lt = filterValue.lt;
      if (filterValue.lte !== undefined) conditions.lte = filterValue.lte;
      if (filterValue.contains !== undefined) conditions.contains = filterValue.contains;
      if (filterValue.startsWith !== undefined) conditions.startsWith = filterValue.startsWith;
      if (filterValue.endsWith !== undefined) conditions.endsWith = filterValue.endsWith;
      if (filterValue.in !== undefined) conditions.in = filterValue.in;

      if (Object.keys(conditions).length > 0) {
        (where as Record<string, unknown>)[key] = conditions;
      }
    } else {
      (where as Record<string, unknown>)[key] = value;
    }
  }

  return where;
}

/**
 * Build search condition for multiple fields
 */
export function buildSearchCondition(
  search: string,
  fields: string[],
): Prisma.Enumerable<Prisma.StringFilter> | undefined {
  if (!search || fields.length === 0) return undefined;

  return fields.map((field) => ({
    [field]: { contains: search, mode: 'insensitive' as const },
  })) as Prisma.Enumerable<Prisma.StringFilter>;
}

/**
 * Parse boolean string to boolean
 */
export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/**
 * Parse date range filter
 */
export function buildDateRangeFilter(
  startDate?: string,
  endDate?: string,
): Prisma.DateTimeFilter | undefined {
  if (!startDate && !endDate) return undefined;

  const filter: Prisma.DateTimeFilter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);

  return filter;
}
