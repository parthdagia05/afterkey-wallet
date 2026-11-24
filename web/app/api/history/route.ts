import { getHistory } from "@/lib/store";
import { dailySpent, POLICY } from "@/lib/policy";

export async function GET() {
  const history = await getHistory();
  const sends = history.filter((h) => h.kind === "send");
  return Response.json({
    history: history.slice(0, 100),
    summary: {
      total: history.length,
      sent: sends.filter((h) => h.status === "sent").length,
      blocked: sends.filter((h) => h.status === "blocked").length,
      rejected: sends.filter((h) => h.status === "rejected").length,
      dailySpent: await dailySpent(),
      dailyLimit: POLICY.dailyLimit,
    },
  });
}
