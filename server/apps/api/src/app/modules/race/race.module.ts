import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomsModule } from '../rooms/rooms.module';
import { QuotesModule } from '../quotes/quotes.module';
import { RaceGateway } from './race.gateway';
import { RaceService } from './race.service';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [
    // RoomsModule is imported so RaceGateway and RaceService can use RoomsService
    RoomsModule,

    // QuotesModule is imported so RaceService can use QuotesService
    QuotesModule,

    LeaderboardModule, // needed so RaceService can call upsertStats at race end

    // JwtModule is needed by RaceGateway to verify tokens on WebSocket connection
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [RaceGateway, RaceService],
})
export class RaceModule {}