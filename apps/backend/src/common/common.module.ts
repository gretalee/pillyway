import { Module } from '@nestjs/common';

import { DeleteAuthorizationService } from './delete-authorization.service';

@Module({
  providers: [DeleteAuthorizationService],
  exports: [DeleteAuthorizationService],
})
export class CommonModule {}
