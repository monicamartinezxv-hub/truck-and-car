export type FlashParams = {
  msg?: string;
  err?: string;
};

export function flashSuccess(path: string, message: string): string {
  return withParam(path, 'msg', message);
}

export function flashError(path: string, message: string): string {
  return withParam(path, 'err', message);
}

function withParam(path: string, key: string, value: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}
