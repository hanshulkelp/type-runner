import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Leaderboard } from './leaderboard.model';
import { User } from '../user/user.model';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  imports: [
    // registers Leaderboard and User models so they can be injected with @InjectModel
    SequelizeModule.forFeature([Leaderboard, User]),
  ],
  controllers: [LeaderboardController],
  providers:   [LeaderboardService],
  exports:     [LeaderboardService], // exported so RaceModule can call upsertStats at race end
})
export class LeaderboardModule {}