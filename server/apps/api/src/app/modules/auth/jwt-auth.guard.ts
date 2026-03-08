import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// apply this to any REST route that requires a logged-in user
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}