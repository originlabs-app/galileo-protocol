export function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
