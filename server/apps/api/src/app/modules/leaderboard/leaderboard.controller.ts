import { Controller, Get } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // GET /api/leaderboard
  // Public endpoint — no auth required to view the leaderboard
  @Get()
  async getLeaderboard() {
    return this.leaderboardService.getTopTen();
  }
}