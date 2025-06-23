# API Documentation

This document provides instructions on how to use the API to access service and issue data.

## Authentication

The API uses **Bearer Token authentication**. You must include your API key in the `Authorization` header with every request.

You can generate and manage your API keys in the **API Manager** section of the super-admin interface.

**Example Header:**
`Authorization: Bearer YOUR_API_KEY`

**Important Note:** All API keys are scoped to a specific department. All requests made with a key will automatically be filtered to only return data (services and issues) belonging to that department. The department information is included at the top level of every API response.

---

## Rate Limiting

The API is rate-limited to prevent abuse and ensure stability. By default, you are allowed **250 requests every 15 minutes** per API key.

If you exceed this limit, you will receive a `429 Too Many Requests` HTTP error code.

The following headers are sent with every API response to help you track your usage:
- `RateLimit-Limit`: The total number of requests allowed in the current window.
- `RateLimit-Remaining`: The number of requests you have left in the current window.
- `RateLimit-Reset`: The time when the rate limit window resets, in UTC epoch seconds.

---

## Endpoints

All endpoints are prefixed with `/api/v1`.

### Services Endpoint

The services endpoint allows you to retrieve information about services.

**URL:** `/api/v1/services`
**Method:** `GET`

#### Query Parameters

| Parameter            | Type    | Description                                                                 |
| -------------------- | ------- | --------------------------------------------------------------------------- |
| `page`               | Integer | The page number for pagination. Defaults to `1`.                            |
| `limit`              | Integer | The number of results per page. Defaults to `25`. Set to `all` to retrieve all results. |
| `id`                 | UUID    | Filter services by a specific service ID.                                   |
| `name`               | String  | Filter services by name (case-insensitive, partial match).                  |
| `rosid`              | String  | Filter services by their ROSID.                                             |
| `cmdbid`             | String  | Filter services by their CMDBID.                                            |

#### Example Requests

**Get the first page of services:**
```bash
curl -X GET 'http://localhost:3411/api/v1/services' \
-H "Authorization: Bearer YOUR_API_KEY"
```

**Get all services for the department (no pagination):**
```bash
curl -X GET 'http://localhost:3411/api/v1/services?limit=all' \
-H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response
```json
{
  "department": {
    "id": "dep1-id-goes-here",
    "name": "Example Department"
  },
  "data": [
    {
      "id": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
      "name": "My Example Service",
      "url": "https://example.service.gov.uk",
      "created_at": "2023-10-27T10:00:00.000Z",
      "updated_at": "2023-10-27T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

---

### Services List Endpoint

This endpoint provides a simplified list of all services within the key's department, containing only their `id` and `name`. This is useful for populating dropdowns or lists in a user interface.

**URL:** `/api/v1/services/list`
**Method:** `GET`

#### Query Parameters

This endpoint does not accept any query parameters.

#### Example Request
```bash
curl -X GET 'http://localhost:3411/api/v1/services/list' \
-H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response
```json
{
  "department": {
    "id": "dep1-id-goes-here",
    "name": "Example Department"
  },
  "data": [
    {
      "id": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
      "name": "My Example Service"
    },
    {
      "id": "b2c3d4e5-f6a7-b8c9-d0e1-f2a3b4c5d6e7",
      "name": "Another Service"
    }
  ]
}
```

---

### Issues Endpoint

The issues endpoint allows you to retrieve information about accessibility issues.

**URL:** `/api/v1/issues`
**Method:** `GET`

#### Query Parameters

| Parameter       | Type    | Description                                                                |
| --------------- | ------- | -------------------------------------------------------------------------- |
| `page`          | Integer | The page number for pagination. Defaults to `1`.                           |
| `limit`         | Integer | The number of results per page. Defaults to `25`. Set to `all` to retrieve all results. |
| `id`            | UUID    | Filter issues by a specific issue ID.                                      |
| `service_id`    | UUID    | Filter issues by the service they belong to.                               |
| `status`        | String  | Filter issues by status. Options: `open`, `in_progress`, `resolved`, `closed`. |
| `wcag_criteria` | String  | Filter issues by WCAG criterion (e.g., `1.1.1`). Partial match.              |
| `issue_type`    | String  | Filter issues by type. Options: `wcag`, `best_practice`, `usability`, `not_known`. |
| `planned_fix`   | Boolean | Filter issues based on whether a fix is planned (`true` or `false`).         |

#### Example Requests

**Get all "open" issues for a specific service:**
```bash
curl -X GET 'http://localhost:3411/api/v1/issues?status=open&service_id=a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6' \
-H "Authorization: Bearer YOUR_API_KEY"
```

**Get all issues for the department (no pagination):**
```bash
curl -X GET 'http://localhost:3411/api/v1/issues?limit=all' \
-H "Authorization: Bearer YOUR_API_KEY"
```

#### Example Response
```json
{
  "department": {
    "id": "dep1-id-goes-here",
    "name": "Example Department"
  },
  "data": [
    {
      "id": "f1e2d3c4-b5a6-f7e8-d9c0-b1a2f3e4d5c6",
      "service_id": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
      "title": "Image missing alt text",
      "description": "The main logo on the homepage is missing an alt attribute.",
      "status": "open",
      "risk_level": "high",
      "wcag_criteria": "1.1.1 Non-text Content",
      "source_of_discovery": "Internal audit",
      "created_by": "...",
      "assigned_to": null,
      "created_at": "2023-10-27T11:00:00.000Z",
      "updated_at": "2023-10-27T11:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

---