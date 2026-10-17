import type { JsonObject } from "swagger-ui-express";

const jsonResponse = (
  description: string,
  schema?: JsonObject,
): JsonObject => ({
  description,
  ...(schema ? { content: { "application/json": { schema } } } : {}),
});

const requestBody = (schema: string): JsonObject => ({
  required: true,
  content: {
    "application/json": {
      schema: { $ref: `#/components/schemas/${schema}` },
    },
  },
});

const operation = (
  summary: string,
  tag: string,
  responses: Record<string, JsonObject>,
  extra: JsonObject = {},
): JsonObject => ({
  summary,
  tags: [tag],
  responses,
  ...extra,
});

const success = jsonResponse("Successful response");
const errors = {
  "400": jsonResponse("Invalid request", {
    $ref: "#/components/schemas/Error",
  }),
  "500": jsonResponse("Unexpected server error", {
    $ref: "#/components/schemas/Error",
  }),
};
const adminErrors = {
  ...errors,
  "401": jsonResponse("Admin session is missing or invalid", {
    $ref: "#/components/schemas/Error",
  }),
  "403": jsonResponse("Admin request header is missing", {
    $ref: "#/components/schemas/Error",
  }),
};
const adminSecurity = [{ adminCookie: [], adminRequestHeader: [] }];

export const openApiSpec: JsonObject = {
  openapi: "3.0.3",
  info: {
    title: "Western Insider Resources API",
    version: "1.0.0",
    description: "Public content and authenticated administration API.",
  },
  servers: [{ url: "/api", description: "Current API server" }],
  tags: [
    {
      name: "Public",
      description: "Public stories, comments, advertising and tracking.",
    },
    {
      name: "Authentication",
      description: "Admin login and cookie-based session management.",
    },
    {
      name: "Admin",
      description:
        "Admin operations require the HttpOnly admin cookie and X-Admin-Request: 1.",
    },
  ],
  paths: {
    "/health": {
      get: operation("Check API health", "Public", {
        "200": jsonResponse("API is available", {
          type: "object",
          properties: { ok: { type: "boolean", example: true } },
        }),
      }),
    },
    "/docs/": {
      get: operation("Open the interactive Swagger UI", "Public", {
        "200": jsonResponse("Swagger UI HTML page"),
      }),
    },
    "/docs/openapi.json": {
      get: operation("Download the OpenAPI specification", "Public", {
        "200": jsonResponse("OpenAPI 3.0.3 document"),
      }),
    },
    "/categories": {
      get: operation("List public categories", "Public", {
        "200": success,
        ...errors,
      }),
    },
    "/posts": {
      get: operation(
        "List and search published stories",
        "Public",
        {
          "200": success,
          ...errors,
        },
        {
          parameters: [
            {
              in: "query",
              name: "category",
              schema: { type: "string" },
              description: "Category slug.",
            },
            {
              in: "query",
              name: "q",
              schema: { type: "string" },
              description: "Search title and excerpt.",
            },
            {
              in: "query",
              name: "page",
              schema: { type: "integer", default: 1 },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 12, maximum: 30 },
            },
          ],
        },
      ),
    },
    "/posts/trending": {
      get: operation("List trending published stories", "Public", {
        "200": success,
        ...errors,
      }),
    },
    "/posts/{slug}": {
      get: operation(
        "Get a published story and related stories",
        "Public",
        {
          "200": success,
          "404": jsonResponse("Story not found", {
            $ref: "#/components/schemas/Error",
          }),
          ...errors,
        },
        {
          parameters: [
            {
              in: "path",
              name: "slug",
              required: true,
              schema: { type: "string" },
            },
          ],
        },
      ),
    },
    "/posts/{slug}/like": {
      get: operation(
        "Get like state and count",
        "Public",
        { "200": success, ...errors },
        {
          parameters: [
            {
              in: "path",
              name: "slug",
              required: true,
              schema: { type: "string" },
            },
            { in: "query", name: "visitorId", schema: { type: "string" } },
          ],
        },
      ),
      post: operation(
        "Toggle a visitor's like",
        "Public",
        {
          "200": success,
          ...errors,
          "400": jsonResponse("Visitor ID is required", {
            $ref: "#/components/schemas/Error",
          }),
        },
        {
          parameters: [
            {
              in: "path",
              name: "slug",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: requestBody("LikeInput"),
        },
      ),
    },
    "/posts/{slug}/comments": {
      get: operation(
        "List visible comments and replies",
        "Public",
        { "200": success, ...errors },
        {
          parameters: [
            {
              in: "path",
              name: "slug",
              required: true,
              schema: { type: "string" },
            },
          ],
        },
      ),
      post: operation(
        "Post a comment or reply",
        "Public",
        {
          "201": success,
          ...errors,
          "400": jsonResponse("Comment name and body are required", {
            $ref: "#/components/schemas/Error",
          }),
        },
        {
          parameters: [
            {
              in: "path",
              name: "slug",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: requestBody("CommentInput"),
        },
      ),
    },
    "/ads": {
      get: operation(
        "List active public ads",
        "Public",
        { "200": success, ...errors },
        {
          parameters: [
            {
              in: "query",
              name: "placement",
              schema: {
                type: "string",
                enum: ["header", "sidebar", "in_article", "footer"],
              },
            },
          ],
        },
      ),
    },
    "/social": {
      get: operation("List active public social links", "Public", {
        "200": success,
        ...errors,
      }),
    },
    "/track": {
      post: operation(
        "Record a page view or click",
        "Public",
        {
          "204": jsonResponse("Event recorded"),
          ...errors,
          "400": jsonResponse("Unsupported event type"),
        },
        { requestBody: requestBody("TrackEventInput") },
      ),
    },
    "/auth/login": {
      post: operation(
        "Sign in as an admin",
        "Authentication",
        {
          "200": jsonResponse(
            "Signed in; sets the HttpOnly admin_token cookie",
          ),
          ...errors,
          "400": jsonResponse("Invalid credentials request", {
            $ref: "#/components/schemas/Error",
          }),
          "401": jsonResponse("Email or password is incorrect", {
            $ref: "#/components/schemas/Error",
          }),
        },
        { requestBody: requestBody("Credentials") },
      ),
    },
    "/auth/signup": {
      post: operation(
        "Create an admin account",
        "Authentication",
        {
          "201": jsonResponse(
            "Account created; sets the HttpOnly admin_token cookie",
          ),
          ...errors,
          "400": jsonResponse("Invalid signup request", {
            $ref: "#/components/schemas/Error",
          }),
          "403": jsonResponse("Invite code is invalid", {
            $ref: "#/components/schemas/Error",
          }),
          "409": jsonResponse("Email already exists", {
            $ref: "#/components/schemas/Error",
          }),
        },
        { requestBody: requestBody("SignupInput") },
      ),
    },
    "/auth/session": {
      get: operation(
        "Check current admin session",
        "Authentication",
        {
          "200": success,
          "401": jsonResponse("Admin session is missing or invalid", {
            $ref: "#/components/schemas/Error",
          }),
        },
        { security: adminSecurity },
      ),
    },
    "/auth/logout": {
      post: operation("Sign out and clear the admin cookie", "Authentication", {
        "204": jsonResponse("Cookie cleared"),
      }),
    },
    "/auth/signup-config": {
      get: operation(
        "Check whether signup requires an invite code",
        "Authentication",
        { "200": success },
      ),
    },
    "/admin/upload": {
      post: operation(
        "Upload story images",
        "Admin",
        {
          "200": success,
          ...adminErrors,
        },
        {
          security: adminSecurity,
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["images"],
                  properties: {
                    images: {
                      type: "array",
                      maxItems: 3,
                      items: { type: "string", format: "binary" },
                    },
                  },
                },
              },
            },
          },
        },
      ),
    },
    "/admin/upload/remove": {
      post: operation(
        "Remove an uploaded image",
        "Admin",
        { "204": jsonResponse("Image removed"), ...adminErrors },
        {
          security: adminSecurity,
          requestBody: requestBody("RemoveUploadInput"),
        },
      ),
    },
    "/admin/posts": {
      get: operation(
        "List all stories",
        "Admin",
        { "200": success, ...adminErrors },
        { security: adminSecurity },
      ),
      post: operation(
        "Create a story",
        "Admin",
        { "201": success, ...adminErrors },
        {
          security: adminSecurity,
          requestBody: requestBody("PostInput"),
        },
      ),
    },
    "/admin/posts/{id}": {
      get: operation(
        "Get a story for editing",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
        },
      ),
      put: operation(
        "Update a story",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: requestBody("PostInput"),
        },
      ),
      delete: operation(
        "Delete a story",
        "Admin",
        { "204": jsonResponse("Story deleted"), ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
        },
      ),
    },
    "/admin/categories": {
      get: operation(
        "List categories",
        "Admin",
        { "200": success, ...adminErrors },
        { security: adminSecurity },
      ),
      post: operation(
        "Create a category",
        "Admin",
        { "201": success, ...adminErrors },
        {
          security: adminSecurity,
          requestBody: requestBody("CategoryInput"),
        },
      ),
    },
    "/admin/categories/{id}": {
      put: operation(
        "Update a category",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: requestBody("CategoryInput"),
        },
      ),
      delete: operation(
        "Delete a category",
        "Admin",
        { "204": jsonResponse("Category deleted"), ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
        },
      ),
    },
    "/admin/comments": {
      get: operation(
        "List comments for moderation",
        "Admin",
        { "200": success, ...adminErrors },
        { security: adminSecurity },
      ),
    },
    "/admin/comments/{id}": {
      patch: operation(
        "Change comment visibility",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: requestBody("CommentStatusInput"),
        },
      ),
      delete: operation(
        "Delete a comment",
        "Admin",
        { "204": jsonResponse("Comment deleted"), ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
        },
      ),
    },
    "/admin/ads": {
      get: operation(
        "List ads and click counts",
        "Admin",
        { "200": success, ...adminErrors },
        { security: adminSecurity },
      ),
      post: operation(
        "Create an ad",
        "Admin",
        { "201": success, ...adminErrors },
        {
          security: adminSecurity,
          requestBody: requestBody("AdInput"),
        },
      ),
    },
    "/admin/ads/{id}": {
      put: operation(
        "Update an ad",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: requestBody("AdInput"),
        },
      ),
      patch: operation(
        "Change whether an ad is active",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: requestBody("ActiveInput"),
        },
      ),
      delete: operation(
        "Delete an ad",
        "Admin",
        { "204": jsonResponse("Ad deleted"), ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
        },
      ),
    },
    "/admin/social": {
      get: operation(
        "List admin social links",
        "Admin",
        { "200": success, ...adminErrors },
        { security: adminSecurity },
      ),
      post: operation(
        "Create a social link",
        "Admin",
        { "201": success, ...adminErrors },
        {
          security: adminSecurity,
          requestBody: requestBody("SocialLinkInput"),
        },
      ),
    },
    "/admin/social/{id}": {
      patch: operation(
        "Change whether a social link is active",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: requestBody("ActiveInput"),
        },
      ),
      delete: operation(
        "Delete a social link",
        "Admin",
        { "204": jsonResponse("Social link deleted"), ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" },
            },
          ],
        },
      ),
    },
    "/admin/analytics": {
      get: operation(
        "Get traffic analytics",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            {
              in: "query",
              name: "days",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 365,
                default: 30,
              },
            },
          ],
        },
      ),
    },
    "/admin/adsense": {
      get: operation(
        "Get AdSense earnings report",
        "Admin",
        { "200": success, ...adminErrors },
        {
          security: adminSecurity,
          parameters: [
            { in: "query", name: "range", schema: { type: "string" } },
          ],
        },
      ),
    },
  },
  components: {
    securitySchemes: {
      adminCookie: {
        type: "apiKey",
        in: "cookie",
        name: "admin_token",
        description: "HttpOnly cookie set by /auth/login or /auth/signup.",
      },
      adminRequestHeader: {
        type: "apiKey",
        in: "header",
        name: "X-Admin-Request",
        description: "Set to 1 for admin API requests.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Something went wrong." },
        },
      },
      Credentials: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      SignupInput: {
        allOf: [
          { $ref: "#/components/schemas/Credentials" },
          { type: "object", properties: { inviteCode: { type: "string" } } },
        ],
      },
      LikeInput: {
        type: "object",
        required: ["visitorId"],
        properties: { visitorId: { type: "string" } },
      },
      TrackEventInput: {
        type: "object",
        required: ["type", "path"],
        properties: {
          type: { type: "string", enum: ["view", "click"] },
          path: { type: "string" },
          target: { type: "string" },
          visitorId: { type: "string" },
          referrer: { type: "string", format: "uri" },
        },
      },
      CommentInput: {
        type: "object",
        required: ["name", "body"],
        properties: {
          name: { type: "string", maxLength: 60 },
          body: { type: "string", maxLength: 2000 },
          parentId: { type: "integer", nullable: true },
        },
      },
      ImageInput: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", format: "uri" },
          public_id: { type: "string", nullable: true },
          caption: { type: "string", maxLength: 200 },
        },
      },
      PostInput: {
        type: "object",
        required: ["title", "images"],
        properties: {
          title: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          images: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { $ref: "#/components/schemas/ImageInput" },
          },
          excerpt: { type: "string", maxLength: 400 },
          body: { type: "string" },
          categoryId: { type: "integer", nullable: true },
          featured: { type: "boolean" },
          author: { type: "string", maxLength: 80 },
        },
      },
      CategoryInput: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" }, position: { type: "integer" } },
      },
      CommentStatusInput: {
        type: "object",
        properties: { status: { type: "string", enum: ["visible", "hidden"] } },
      },
      AdInput: {
        type: "object",
        required: ["name", "placement"],
        properties: {
          name: { type: "string" },
          placement: {
            type: "string",
            enum: ["header", "sidebar", "in_article", "footer"],
          },
          image_url: { type: "string", format: "uri", nullable: true },
          image_public_id: { type: "string", nullable: true },
          link_url: { type: "string", format: "uri", nullable: true },
          html_code: { type: "string", nullable: true },
          active: { type: "boolean" },
        },
      },
      SocialLinkInput: {
        type: "object",
        required: ["platform", "url"],
        properties: {
          platform: { type: "string" },
          url: { type: "string", format: "uri" },
        },
      },
      ActiveInput: {
        type: "object",
        required: ["active"],
        properties: { active: { type: "boolean" } },
      },
      RemoveUploadInput: {
        type: "object",
        required: ["public_id"],
        properties: { public_id: { type: "string" } },
      },
    },
  },
};
