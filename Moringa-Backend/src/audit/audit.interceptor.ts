import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLoggerService } from './audit-logger.service';

const AUDIT_ACTION = 'audit_action';
const AUDIT_ENTITY_TYPE = 'audit_entity_type';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogger: AuditLoggerService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: number } }>();
    const handler = context.getHandler();
    const classRef = context.getClass();

    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION, [
      handler,
      classRef,
    ]);
    const entityType = this.reflector.getAllAndOverride<string>(
      AUDIT_ENTITY_TYPE,
      [handler, classRef],
    );

    if (!action || !entityType) {
      return next.handle();
    }

    return next.handle().pipe(
      map(async (result: { id?: number; __oldValue?: unknown } | undefined) => {
        await this.auditLogger.log(
          action,
          entityType,
          result?.id ?? null,
          result?.__oldValue as string | undefined,
          JSON.stringify(result),
          request,
        );
        return result;
      }),
    );
  }
}
