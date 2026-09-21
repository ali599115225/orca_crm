export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function parsePagination(searchParams: URLSearchParams | Record<string, string | undefined>): Required<PaginationParams> {
  let pageStr = '1', limitStr = '50';
  if (searchParams instanceof URLSearchParams) {
    pageStr = searchParams.get('page') || '1';
    limitStr = searchParams.get('limit') || '50';
  } else {
    pageStr = searchParams.page || '1';
    limitStr = searchParams.limit || '50';
  }
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 50));
  return { page, limit };
}

export function paginatedResult<T>(data: T[], total: number, params: Required<PaginationParams>): PaginatedResult<T> {
  return { data, page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) };
}
