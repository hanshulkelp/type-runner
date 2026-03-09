import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';

@Module({
  providers: [QuotesService],
  exports: [QuotesService], // exported so RaceModule can inject QuotesService
})
export class QuotesModule {}