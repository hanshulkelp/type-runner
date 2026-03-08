import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Leaderboard } from './leaderboard.model';
import { User } from '../user/user.model';
import { SaveResultDto } from './dto/save-result.dto';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Leaderboard)
    private readonly leaderboardModel: typeof Leaderboard,
  ) {}

  // Returns the top 10 players sorted by best WPM
  async getTopTen(): Promise<Leaderboard[]> {
    return this.leaderboardModel.findAll({
      // join users table to get the username alongside leaderboard stats
      include: [{ model: User, attributes: ['username'] }],
      // specific columns only — no SELECT *
      attributes: ['bestWpm', 'avgAccuracy', 'racesPlayed', 'wins'],
      order: [['bestWpm', 'DESC']],
      limit: 10,
    });
  }

  // Upserts a player's stats after a race ends
  // If a row exists for this user, update it. Otherwise insert a new one.
  async upsertStats(dto: SaveResultDto): Promise<void> {
    const existingRow = await this.leaderboardModel.findOne({
      where: { userId: dto.userId },
    });

    const hasWon = dto.position === 1;

    if (!existingRow) {
      // first race for this user — create a new row
      await this.leaderboardModel.create({
        userId:      dto.userId,
        bestWpm:     dto.wpm,
        avgAccuracy: dto.accuracy,
        racesPlayed: 1,
        wins:        hasWon ? 1 : 0,
      });
      return;
    }

    // keep the highest WPM this user has ever achieved
    const updatedBestWpm = Math.max(existingRow.bestWpm, dto.wpm);

    // rolling average: (oldAvg * oldCount + newValue) / newCount
    const updatedAvgAccuracy =
      (existingRow.avgAccuracy * existingRow.racesPlayed + dto.accuracy) /
      (existingRow.racesPlayed + 1);

    await existingRow.update({
      bestWpm:     updatedBestWpm,
      avgAccuracy: parseFloat(updatedAvgAccuracy.toFixed(2)),
      racesPlayed: existingRow.racesPlayed + 1,
      wins:        existingRow.wins + (hasWon ? 1 : 0),
    });
  }
}