import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { estimateCostUsd } from '../config/model-pricing';

/**
 * Every OpenAI call in the app reports here. This is what makes "route the
 * cheap thing to GPT-5 Mini" (architecture §11) a checkable claim instead of
 * an assumption — query ai_usage_logs by feature/model to see if the
 * routing table is actually holding.
 */
@Injectable()
export class UsageTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string | null;
    feature: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
  }): Promise<void> {
    await this.prisma.aiUsageLog.create({
      data: {
        userId: params.userId ?? undefined,
        feature: params.feature,
        model: params.model,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        estimatedCostUsd: estimateCostUsd(params.model, params.promptTokens, params.completionTokens),
      },
    });
  }

  /** Rollup for an ops/cost dashboard — total spend and call volume per feature over a window. */
  async summarizeByFeature(since: Date): Promise<{ feature: string; calls: number; totalCostUsd: number }[]> {
    const rows = await this.prisma.aiUsageLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { estimatedCostUsd: true },
    });
    return rows.map((r) => ({ feature: r.feature, calls: r._count._all, totalCostUsd: r._sum.estimatedCostUsd ?? 0 }));
  }
}
