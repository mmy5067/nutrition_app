export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  let data = {} as T;
  try {
    data = (await response.json()) as T;
  } catch {}

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${Math.round(Number(value) * 10) / 10}`;
}

export function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}
