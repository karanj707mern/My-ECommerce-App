import { Module } from '@nestjs/common';
import nestia from 'nestia';

/**
 * Backend Application Wrapper for Nestia SDK Generation
 * 
 * This module wraps the entire AppModule so Nestia can analyze
 * all controllers and generate a type-safe SDK.
 * 
 * The frontend will ONLY use the generated SDK from libs/nestia-sdk.
 * It will NEVER import from this module directly.
 */
@Module({
  imports: [
    // Import all feature modules here for Nestia analysis
  ],
  controllers: [],
  providers: [],
})
export class BackendApplication {
  constructor(private readonly app: nestia.NestiaApplication) {}
}
