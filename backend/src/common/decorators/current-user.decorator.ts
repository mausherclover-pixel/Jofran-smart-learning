import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthContext } from '../types/auth-context';

// @CurrentUser() user: AuthContext in any guarded handler — REST or GraphQL.
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const request =
    ctx.getType<'graphql'>() === 'graphql' ? GqlExecutionContext.create(ctx).getContext().req : ctx.switchToHttp().getRequest();
  return request.user;
});
