export async function runScreening(fullName: string, dob?: string) {
  return { provider: process.env.SCREENING_PROVIDER || "none", referenceId: `ref_${Date.now()}`, result: "cleared" };
}
