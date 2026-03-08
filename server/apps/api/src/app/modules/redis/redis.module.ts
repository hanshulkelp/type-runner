import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService], // exported so any module that imports RedisModule can use RedisService
})
export class RedisModule {}