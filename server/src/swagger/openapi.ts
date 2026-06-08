import { env } from '../config/env';

const objectId = { type: 'string' as const, pattern: '^[a-f0-9]{24}$', example: '507f1f77bcf86cd799439011' };

const ErrorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
};

const SuccessEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: {},
  },
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TruBotAI Task Manager API',
    version: '1.0.0',
    description:
      'Multi-tenant task management API with accounts, workspaces, invitations, and real-time task updates via Socket.io.\n\n' +
      '**Authentication:** Send `Authorization: Bearer <accessToken>` on protected routes. Login and refresh set an httpOnly `refreshToken` cookie on `/api/v1/auth` paths.',
  },
  servers: [{ url: `http://localhost:${env.PORT}/api/v1`, description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Authentication', description: 'Register, login, tokens, email verification, password reset' },
    { name: 'Workspaces', description: 'Workspace CRUD and member management' },
    { name: 'Tasks', description: 'Task CRUD, comments, filters, pagination' },
    { name: 'Invites', description: 'Invite users to an account/workspace' },
    { name: 'Members', description: 'Account-level member listing' },
    { name: 'Users', description: 'Workspace user lookup for assignees' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from login, refresh, verify-email, or accept-invite',
      },
    },
    schemas: {
      ErrorResponse,
      User: {
        type: 'object',
        properties: {
          id: objectId,
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
        },
      },
      Account: {
        type: 'object',
        properties: {
          id: objectId,
          name: { type: 'string', example: 'Acme Corp' },
        },
      },
      Workspace: {
        type: 'object',
        properties: {
          id: objectId,
          name: { type: 'string', example: 'Default Workspace' },
          workspaceRole: { type: 'string', enum: ['admin', 'member'] },
          isDefault: { type: 'boolean' },
        },
      },
      AuthPayload: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
          account: { $ref: '#/components/schemas/Account' },
          workspace: { $ref: '#/components/schemas/Workspace' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: objectId,
          title: { type: 'string' },
          description: { type: 'string' },
          status: {
            type: 'string',
            enum: ['todo', 'in_progress', 'done', 'reopened', 'closed'],
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          assignee: { $ref: '#/components/schemas/User' },
          owner: { $ref: '#/components/schemas/User' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          comments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                body: { type: 'string' },
                author: { $ref: '#/components/schemas/User' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkspaceMember: {
        type: 'object',
        properties: {
          userId: objectId,
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          workspaceRole: { type: 'string', enum: ['admin', 'member'] },
        },
      },
      AccountMember: {
        type: 'object',
        properties: {
          userId: objectId,
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          accountRole: { type: 'string', enum: ['admin', 'member'] },
          verificationStatus: { type: 'string', enum: ['verified', 'unverified'] },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid access token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'Insufficient role or permissions',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      ValidationError: {
        description: 'Request validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns API availability status.',
        responses: {
          '200': {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'API is running' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new account',
        description: 'Creates user, account, and default workspace. Sends email verification link.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                  accountName: { type: 'string', minLength: 2, maxLength: 200 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration successful; verification required before login',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    SuccessEnvelope,
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            requiresVerification: { type: 'boolean', example: true },
                            email: { type: 'string', format: 'email' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '409': { description: 'Email already registered' },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in',
        description: 'Returns access token in body and sets httpOnly refresh token cookie.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    SuccessEnvelope,
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/AuthPayload' } } },
                  ],
                },
              },
            },
          },
          '401': { description: 'Invalid credentials or unverified email' },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Log out',
        description: 'Revokes refresh token cookie if present.',
        responses: {
          '200': {
            description: 'Logged out',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Logged out' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Uses httpOnly `refreshToken` cookie. Returns new access token and rotates refresh cookie.',
        responses: {
          '200': {
            description: 'New access token issued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { accessToken: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Refresh token missing or invalid' },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Current user context',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user, account, and active workspace',
            content: { 'application/json': { schema: SuccessEnvelope } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/auth/memberships': {
      get: {
        tags: ['Authentication'],
        summary: 'List account and workspace memberships',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Membership tree for account/workspace switchers' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/auth/switch-context': {
      post: {
        tags: ['Authentication'],
        summary: 'Switch active account/workspace',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['accountId', 'workspaceId'],
                properties: {
                  accountId: objectId,
                  workspaceId: objectId,
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New tokens for selected context',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    SuccessEnvelope,
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/AuthPayload' } } },
                  ],
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/auth/verify-email/{token}/validate': {
      get: {
        tags: ['Authentication'],
        summary: 'Validate email verification token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Token is valid' },
          '404': { description: 'Invalid token' },
          '410': { description: 'Token expired' },
        },
      },
    },

    '/auth/verify-email/{token}': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify email and log in',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Email verified; returns auth payload and refresh cookie',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    SuccessEnvelope,
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/AuthPayload' } } },
                  ],
                },
              },
            },
          },
          '404': { description: 'Invalid token' },
          '410': { description: 'Token expired' },
        },
      },
    },

    '/auth/resend-verification': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend verification email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Generic success message (does not reveal if email exists)' } },
      },
    },

    '/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Generic success message' } },
      },
    },

    '/auth/reset-password/{token}/validate': {
      get: {
        tags: ['Authentication'],
        summary: 'Validate password reset token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Token is valid' },
          '404': { description: 'Invalid token' },
          '410': { description: 'Token expired' },
        },
      },
    },

    '/auth/reset-password/{token}': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string', minLength: 8, maxLength: 128 } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password updated' },
          '400': { $ref: '#/components/responses/ValidationError' },
          '404': { description: 'Invalid token' },
          '410': { description: 'Token expired' },
        },
      },
    },

    '/workspaces': {
      get: {
        tags: ['Workspaces'],
        summary: 'List workspaces in current account',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Verified workspaces with roles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Workspace' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Create workspace',
        description: 'Account admin only. Creator becomes workspace admin.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', minLength: 2, maxLength: 200 } },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Workspace created' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '409': { description: 'Duplicate workspace name in account' },
        },
      },
    },

    '/workspaces/{id}/members': {
      get: {
        tags: ['Workspaces'],
        summary: 'List workspace members',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
        responses: {
          '200': {
            description: 'Verified members with workspace roles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/WorkspaceMember' } },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Add account member to workspace',
        description: 'Workspace or account admin required. Target must be a verified account member.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: { userId: objectId },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Member added' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/workspaces/{id}/members/{userId}': {
      delete: {
        tags: ['Workspaces'],
        summary: 'Remove member from workspace',
        description: 'Cannot remove the last workspace admin.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: objectId },
          { name: 'userId', in: 'path', required: true, schema: objectId },
        ],
        responses: {
          '200': { description: 'Member removed' },
          '400': { description: 'Last workspace admin cannot be removed' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      patch: {
        tags: ['Workspaces'],
        summary: 'Update workspace member role',
        description: 'Promote or demote between admin and member. Cannot demote the last admin.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: objectId },
          { name: 'userId', in: 'path', required: true, schema: objectId },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workspaceRole'],
                properties: { workspaceRole: { type: 'string', enum: ['admin', 'member'] } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Role updated' },
          '400': { description: 'Last workspace admin cannot be demoted' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        description:
          'Workspace admins see all tasks; members see owned or assigned tasks only. Supports filters and pagination.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'done', 'reopened', 'closed'] } },
          { name: 'assignee', in: 'query', schema: objectId },
          { name: 'dueDateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dueDateTo', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['dueDate', 'createdAt'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          '200': {
            description: 'Paginated task list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create task',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 200 },
                  description: { type: 'string', maxLength: 2000 },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  assignee: objectId,
                  dueDate: { type: 'string', format: 'date', description: 'Cannot be in the past' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Task created' },
          '400': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get task by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
        responses: {
          '200': {
            description: 'Task details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            },
          },
          '403': { description: 'Not visible to current user' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Update task',
        description:
          'Owners and workspace admins can edit all fields. Assignees may update status only. Due date cannot be in the past.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', minLength: 1, maxLength: 200 },
                  description: { type: 'string', maxLength: 2000 },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'reopened', 'closed'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  assignee: objectId,
                  dueDate: { type: 'string', format: 'date' },
                  comment: { type: 'string', minLength: 1, maxLength: 2000, description: 'Optional inline comment' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Task updated' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete task',
        description: 'Owner or workspace/account admin only.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
        responses: {
          '200': { description: 'Task deleted' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/tasks/{id}/comments': {
      post: {
        tags: ['Tasks'],
        summary: 'Add comment to task',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['body'],
                properties: { body: { type: 'string', minLength: 1, maxLength: 2000 } },
              },
            },
          },
        },
        responses: { '201': { description: 'Comment added; returns updated task' } },
      },
    },

    '/invites/{token}/validate': {
      get: {
        tags: ['Invites'],
        summary: 'Validate invite token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Invite preview (email, account, workspace)' },
          '404': { description: 'Invalid invite' },
          '410': { description: 'Invite expired or revoked' },
        },
      },
    },

    '/invites/{token}/accept': {
      post: {
        tags: ['Invites'],
        summary: 'Accept invite and register',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  password: { type: 'string', minLength: 8, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User verified and logged in',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    SuccessEnvelope,
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/AuthPayload' } } },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/invites': {
      get: {
        tags: ['Invites'],
        summary: 'List pending invites',
        description: 'Account admin only.',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Pending invitations for the account' } },
      },
      post: {
        tags: ['Invites'],
        summary: 'Create invite',
        description:
          'Account admin only. Verified existing users are added immediately; new users receive a pending invite link and an invitation email.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  workspaceId: { ...objectId, description: 'Defaults to active workspace' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description:
              'User added immediately (`type: added`) or pending invite created (`type: pending`, `inviteUrl`, `emailSent`)',
          },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/invites/{id}': {
      delete: {
        tags: ['Invites'],
        summary: 'Revoke pending invite',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
        responses: {
          '200': { description: 'Invitation revoked' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/members': {
      get: {
        tags: ['Members'],
        summary: 'List account members',
        description: 'Account admin only.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'All members in the current account',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/AccountMember' } },
                  },
                },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List workspace users',
        description: 'Returns users in the active workspace (for task assignee picker).',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Workspace user list' } },
      },
    },
  },
};
