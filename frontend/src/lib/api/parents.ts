import { graphqlRequest } from '@/lib/graphql-client';

export interface ChildSummary {
  id: string;
  fullName: string;
  className: string | null;
  grade: number | null;
  averageMastery: number | null;
  pendingAssessments: number;
}

const PARENT_DASHBOARD_QUERY = /* GraphQL */ `
  query ParentDashboard {
    parentDashboard {
      children {
        id
        fullName
        className
        grade
        averageMastery
        pendingAssessments
      }
    }
  }
`;

// Hits GraphQL, not REST — this is the exact composite query the
// architecture (§03) calls out: one round trip for every child's summary,
// shaped however this screen needs it.
export const parentsApi = {
  getDashboard: () =>
    graphqlRequest<{ parentDashboard: { children: ChildSummary[] } }>(PARENT_DASHBOARD_QUERY).then((d) => d.parentDashboard),
};
