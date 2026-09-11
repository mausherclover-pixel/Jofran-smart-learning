import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

// GraphQL, not REST, because a Parent's dashboard needs a variable, nested
// shape per child (architecture §03) — a REST endpoint here would either
// over-fetch every field for every child or multiply into per-field routes.
@ObjectType()
export class ChildSummary {
  @Field() id!: string;
  @Field() fullName!: string;
  @Field({ nullable: true }) className?: string;
  @Field(() => Int, { nullable: true }) grade?: number;
  @Field(() => Float, { nullable: true }) averageMastery?: number;
  @Field(() => Int) pendingAssessments!: number;
}

@ObjectType()
export class ParentDashboard {
  @Field(() => [ChildSummary])
  children!: ChildSummary[];
}
