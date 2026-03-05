# LogPanda API Schema (v1)

## Base URL

~~~
/api/v1
~~~

All POST, PATCH, and DELETE requests accept JSON bodies.  
Identifiers are passed via body or query parameters (no `:id` path segments).

---

# Authentication

LogPanda uses two authentication mechanisms.

---

## 1. Dashboard / Management API

Used for:

- Organizations
- Projects
- Organization Members
- Project Members
- Project API Keys
- Reading Logs

Header:

~~~
Authorization: Bearer <JWT>
~~~

JWT is issued by Amazon Cognito after login.

---

## 2. Log Ingestion API

Used for sending logs.

Header:

~~~
x-api-key: <apiKey>
~~~

API key format:

~~~
lp_<apiKeyId>_<secret>
~~~

Applies only to:

~~~
POST /ingest
~~~

---

# Standard Response Format

## Success

~~~json
{
  "success": true,
  "data": {}
}
~~~

## Error

~~~json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
~~~

---

# Organizations

## Create Organization

POST `/organizations`

~~~json
{
  "name": "string"
}
~~~

Response:

~~~json
{
  "success": true,
  "data": {
    "organizationId": "string",
    "name": "string",
    "createdAt": "string"
  }
}
~~~

---

## Get Organizations

GET `/organizations?userId=<string>`

---

## Get Organization

GET `/organizations?organizationId=<string>`

---

## Update Organization

PATCH `/organizations`

~~~json
{
  "organizationId": "string",
  "name": "string"
}
~~~

---

## Delete Organization

DELETE `/organizations`

~~~json
{
  "organizationId": "string"
}
~~~

---

# Projects

## Create Project

POST `/projects`

~~~json
{
  "organizationId": "string",
  "name": "string"
}
~~~

---

## Get Projects

GET `/projects?organizationId=<string>`

---

## Get Project

GET `/projects?projectId=<string>`

---

## Update Project

PATCH `/projects`

~~~json
{
  "projectId": "string",
  "name": "string"
}
~~~

---

## Delete Project

DELETE `/projects`

~~~json
{
  "projectId": "string"
}
~~~

---

# Organization Members

## Add Member

POST `/organization-members`

~~~json
{
  "organizationId": "string",
  "userId": "string",
  "role": "OWNER | ADMIN | MEMBER"
}
~~~

---

## Get Members

GET `/organization-members?organizationId=<string>`

---

## Update Member

PATCH `/organization-members`

~~~json
{
  "organizationId": "string",
  "userId": "string",
  "role": "OWNER | ADMIN | MEMBER"
}
~~~

---

## Remove Member

DELETE `/organization-members`

~~~json
{
  "organizationId": "string",
  "userId": "string"
}
~~~

---

# Project Members

## Add Member

POST `/project-members`

~~~json
{
  "projectId": "string",
  "userId": "string",
  "role": "ADMIN | MEMBER | VIEWER"
}
~~~

---

## Get Members

GET `/project-members?projectId=<string>`

---

## Update Member

PATCH `/project-members`

~~~json
{
  "projectId": "string",
  "userId": "string",
  "role": "ADMIN | MEMBER | VIEWER"
}
~~~

---

## Remove Member

DELETE `/project-members`

~~~json
{
  "projectId": "string",
  "userId": "string"
}
~~~

---

# Project API Keys

## Create API Key

POST `/project-api-keys`

~~~json
{
  "projectId": "string",
  "name": "string"
}
~~~

Response:

~~~json
{
  "success": true,
  "data": {
    "apiKeyId": "string",
    "plainKey": "lp_<apiKeyId>_<secret>"
  }
}
~~~

Note:
- The secret is returned only once.
- Creating a new key automatically deactivates the previous active key.

---

## Get API Keys

GET `/project-api-keys?projectId=<string>`

---

## Deactivate API Key

DELETE `/project-api-keys`

~~~json
{
  "apiKeyId": "string"
}
~~~

Keys are soft-deactivated (isActive = false).

---

# Audit Logs

Logs are append-only and written asynchronously via SQS.

Pipeline:

~~~
SDK → API Gateway → Ingest Lambda → SQS → Worker Lambda → DynamoDB
~~~

---

## Create Log (Ingestion)

POST `/ingest`

Header:

~~~
x-api-key: <apiKey>
~~~

Body:

~~~json
{
  "level": "INFO | WARN | ERROR",
  "message": "string",
  "metadata": {}
}
~~~

Response:

~~~json
{
  "success": true,
  "data": {
    "accepted": true
  }
}
~~~

---

## Get Logs

GET `/audit-logs`

Header:

~~~
Authorization: Bearer <JWT>
~~~

Query parameters:

- projectId
- from (ISO date)
- to (ISO date)
- level
- limit (default 50, max 200)

Response:

~~~json
{
  "success": true,
  "data": {
    "logs": []
  }
}
~~~

Log object:

~~~json
{
  "logId": "string",
  "projectId": "string",
  "level": "INFO | WARN | ERROR",
  "message": "string",
  "metadata": {},
  "timestamp": "string"
}
~~~