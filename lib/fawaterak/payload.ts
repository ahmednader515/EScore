export type FawaterakPayLoad = {
  depositId: string;
  userId: string;
  kind: string;
};

export function parsePayLoad(raw: unknown): FawaterakPayLoad | null {
  if (!raw) return null;

  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;
  if (
    typeof obj.depositId !== "string" ||
    typeof obj.userId !== "string" ||
    typeof obj.kind !== "string"
  ) {
    return null;
  }

  return {
    depositId: obj.depositId,
    userId: obj.userId,
    kind: obj.kind,
  };
}
