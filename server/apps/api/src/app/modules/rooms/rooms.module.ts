import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [RedisModule], // RoomsService needs RedisService to store room state
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService], // exported so RaceModule can use RoomsService later
})
export class RoomsModule {}