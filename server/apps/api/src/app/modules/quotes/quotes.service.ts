import { Injectable } from '@nestjs/common';
import { QUOTES } from './quotes.data';

@Injectable()
export class QuotesService {
  // Returns a random quote from the QUOTES array
  getRandomQuote(): string {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    return QUOTES[randomIndex];
  }
}