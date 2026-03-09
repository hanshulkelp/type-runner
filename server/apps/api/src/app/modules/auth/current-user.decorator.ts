import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extracts the user object that JwtStrategy.validate() attached to the request
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);