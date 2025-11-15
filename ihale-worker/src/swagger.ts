import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'İhale Worker API',
      version: '2.0.0',
      description: 'Production-ready Playwright-based scraper for ihalebul.com with browser pooling, rate limiting, and advanced monitoring',
      contact: {
        name: 'Procheff Team',
        url: 'https://github.com/aydarnuman/procheff-v3',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.procheff.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        sessionId: {
          type: 'apiKey',
          in: 'query',
          name: 'sessionId',
          description: 'Session ID obtained from /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'İhalebul.com username',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              description: 'İhalebul.com password',
              example: 'password123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session ID for authenticated requests',
              example: 'abc123xyz789',
            },
            expiresIn: {
              type: 'number',
              description: 'Session expiration time in seconds',
              example: 3600,
            },
          },
        },
        Tender: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Tender ID',
              example: '12345',
            },
            tenderNumber: {
              type: 'string',
              description: 'Tender number (e.g., 2025/1845237)',
              example: '2025/1845237',
            },
            title: {
              type: 'string',
              description: 'Tender title',
              example: 'Yemek İhalesi',
            },
            workName: {
              type: 'string',
              description: 'Work name',
              example: 'Personel Yemek Hizmeti',
            },
            organization: {
              type: 'string',
              description: 'Organization name',
              example: 'İstanbul Belediyesi',
            },
            city: {
              type: 'string',
              description: 'City',
              example: 'İstanbul',
            },
            tenderType: {
              type: 'string',
              description: 'Tender type',
              example: 'Açık ihale usulü',
            },
            partialBidAllowed: {
              type: 'boolean',
              description: 'Whether partial bid is allowed',
              example: false,
            },
            publishDate: {
              type: 'string',
              description: 'Publish date (DD.MM.YYYY)',
              example: '15.11.2025',
            },
            tenderDate: {
              type: 'string',
              description: 'Tender date (DD.MM.YYYY)',
              example: '30.11.2025',
            },
            daysRemaining: {
              type: 'number',
              nullable: true,
              description: 'Days remaining until tender date',
              example: 15,
            },
            url: {
              type: 'string',
              description: 'Tender detail URL',
              example: 'https://www.ihalebul.com/tender/12345',
            },
          },
        },
        TenderDetail: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Tender ID',
            },
            title: {
              type: 'string',
              description: 'Tender title',
            },
            html: {
              type: 'string',
              description: 'Tender HTML content',
            },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                  },
                  url: {
                    type: 'string',
                  },
                  filename: {
                    type: 'string',
                  },
                  fileType: {
                    type: 'string',
                  },
                },
              },
            },
            screenshot: {
              type: 'string',
              description: 'Base64-encoded screenshot',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            service: {
              type: 'string',
              example: 'ihale-worker',
            },
            version: {
              type: 'string',
              example: '2.0.0',
            },
            uptime: {
              type: 'number',
              description: 'Uptime in seconds',
              example: 3600,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            memory: {
              type: 'object',
              properties: {
                heapUsed: {
                  type: 'string',
                  example: '45MB',
                },
                heapTotal: {
                  type: 'string',
                  example: '80MB',
                },
                rss: {
                  type: 'string',
                  example: '120MB',
                },
              },
            },
            browserPool: {
              type: 'object',
              properties: {
                total: {
                  type: 'number',
                  example: 3,
                },
                inUse: {
                  type: 'number',
                  example: 1,
                },
                available: {
                  type: 'number',
                  example: 2,
                },
                waitingInQueue: {
                  type: 'number',
                  example: 0,
                },
              },
            },
            rateLimiter: {
              type: 'object',
              properties: {
                trackedIPs: {
                  type: 'number',
                  example: 15,
                },
                totalRequests: {
                  type: 'number',
                  example: 342,
                },
              },
            },
            config: {
              type: 'object',
              properties: {
                maxConcurrentBrowsers: {
                  type: 'number',
                  example: 3,
                },
                sessionTTL: {
                  type: 'string',
                  example: '28800s',
                },
                rateLimit: {
                  type: 'string',
                  example: '20 requests/60s',
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication endpoints',
      },
      {
        name: 'Tenders',
        description: 'Tender list and details',
      },
      {
        name: 'Export',
        description: 'Export tenders in various formats',
      },
      {
        name: 'Proxy',
        description: 'Document download proxy',
      },
      {
        name: 'Health',
        description: 'Health check and monitoring',
      },
      {
        name: 'Debug',
        description: 'Debug endpoints',
      },
    ],
  },
  apis: ['./src/**/*.ts'], // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
