import { applyDecorators, SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION = 'audit_action';
export const AUDIT_ENTITY_TYPE = 'audit_entity_type';

export function AuditLog(action: string, entityType: string): MethodDecorator {
  return applyDecorators(
    SetMetadata(AUDIT_ACTION, action),
    SetMetadata(AUDIT_ENTITY_TYPE, entityType),
  );
}
