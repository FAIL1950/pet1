import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '@app/common';
import { addMemberSchema, changeMemberRoleSchema } from './members.schema.js';

describe('member schemas via ZodValidationPipe', () => {
  it('normalizes the email and accepts EDITOR/VIEWER', () => {
    expect(
      new ZodValidationPipe(addMemberSchema).transform({
        email: '  Bob@Example.COM ',
        role: 'VIEWER',
      }),
    ).toEqual({ email: 'bob@example.com', role: 'VIEWER' });
  });

  it.each([
    [addMemberSchema, { email: 'not-an-email', role: 'EDITOR' }],
    [addMemberSchema, { email: 'b@example.com', role: 'OWNER' }],
    [changeMemberRoleSchema, { role: 'OWNER' }],
    [changeMemberRoleSchema, {}],
  ])('rejects invalid bodies with 400 (%#)', (schema, body) => {
    expect(() => new ZodValidationPipe(schema).transform(body)).toThrow(
      BadRequestException,
    );
  });
});
