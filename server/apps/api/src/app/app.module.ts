import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ThrottlerModule } from '@nestjs/throttler';
import { dbConfig } from '../config/db.config';
import { UsersModule } from './modules/user/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { RaceModule } from './modules/race/race.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';

@Module({
  imports: [
    // isGlobal=true means ConfigModule is available everywhere
    // without needing to import it in every sub-module
    ConfigModule.forRoot({ isGlobal: true }),

    // connects to Postgres using values from .env
    SequelizeModule.forRootAsync(dbConfig),

    // rate limiting — max 10 requests per minute per IP globally
    ThrottlerModule.forRoot([{
      ttl:   60000, // 1 minute in milliseconds
      limit: 10,    // max 10 requests per IP per minute
    }]),

    UsersModule,
    AuthModule,
    RoomsModule,
    QuotesModule,
    RaceModule,
    LeaderboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}