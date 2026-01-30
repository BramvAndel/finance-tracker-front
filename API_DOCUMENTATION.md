# Expense Tracker API Documentation

A RESTful API for managing personal expenses with user authentication, categories, and expense tracking.

## Table of Contents
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Auth Routes](#auth-routes)
  - [User Routes](#user-routes)
  - [Category Routes](#category-routes)
  - [Expense Routes](#expense-routes)
- [Error Handling](#error-handling)
- [Database Schema](#database-schema)

---

## Getting Started

### Base URL
```
http://localhost:3000/api/v1
```

### Prerequisites
- Node.js v14+
- MySQL/MariaDB
- npm or yarn

### Installation
```bash
npm install
npm start
```

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=expensetracker
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## Authentication

This API uses **JWT (JSON Web Tokens)** stored in **HTTP-only cookies** for authentication.

### How It Works
1. User registers or logs in
2. Server sets JWT token in secure HTTP-only cookie
3. Cookie is automatically sent with subsequent requests
4. Server validates token from cookie

### Cookie Configuration
- **Name**: `token`
- **HttpOnly**: `true` (prevents JavaScript access)
- **SameSite**: `strict` (CSRF protection)
- **Secure**: `true` (in production, HTTPS only)
- **Max Age**: 24 hours

### Frontend Setup
When making requests from frontend, include credentials:

**Fetch API:**
```javascript
fetch('http://localhost:3000/api/v1/users', {
  credentials: 'include'
})
```

**Axios:**
```javascript
axios.defaults.withCredentials = true;
```

### Roles
- **user**: Regular user (default)
- **admin**: Administrator with elevated permissions

---

## API Endpoints

### Auth Routes

#### Register User
Create a new user account and automatically login.

**Endpoint:** `POST /auth/register`

**Authentication:** Not required

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "password": "securePassword123",
  "role": "user"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "created_at": "2026-01-21T10:00:00.000Z",
    "updated_at": "2026-01-21T10:00:00.000Z"
  },
  "message": "Registration successful"
}
```

**Notes:**
- Password is automatically hashed using bcrypt
- JWT token automatically set in HTTP-only cookie
- `role` is optional (defaults to "user")
- **Recommended for frontend registration** (handles authentication automatically)
- Alternative: Use `POST /users` if you want to register without automatic login

---

#### Login
Authenticate and receive JWT token.

**Endpoint:** `POST /auth/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "first_name": "John",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "created_at": "2026-01-21T10:00:00.000Z",
    "updated_at": "2026-01-21T10:00:00.000Z"
  },
  "message": "Login successful"
}
```

**Error Response:** `401 Unauthorized`
```json
{
  "error": "Invalid credentials"
}
```

---

#### Logout
Clear authentication cookie.

**Endpoint:** `POST /auth/logout`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "message": "Logout successful"
}
```

---

### User Routes

#### Get All Users
Retrieve all users (admin only).

**Endpoint:** `GET /users`

**Authentication:** Required (Admin only)

**Response:** `200 OK`
```json
[
  {
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "created_at": "2026-01-21T10:00:00.000Z",
    "updated_at": "2026-01-21T10:00:00.000Z"
  }
]
```

**Notes:**
- Only accessible by admin users
- Does not return password hashes

---

#### Get User by ID
Retrieve a specific user (owner or admin only).

**Endpoint:** `GET /users/:id`

**Authentication:** Required (Owner or Admin)

**Response:** `200 OK`
```json
{
  "user_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "created_at": "2026-01-21T10:00:00.000Z",
  "updated_at": "2026-01-21T10:00:00.000Z"
}
```

**Error Response:** `403 Forbidden`
```json
{
  "error": "Access denied. You can only access your own resources."
}
```

---

#### Create User
Create a new user account (public - anyone can register).

**Endpoint:** `POST /users`

**Authentication:** Not required

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "password": "securePassword456",
  "role": "user"
}
```

**Response:** `201 Created`
```json
{
  "user_id": 2,
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "user",
  "created_at": "2026-01-21T10:30:00.000Z",
  "updated_at": "2026-01-21T10:30:00.000Z"
}
```

**Notes:**
- This is an alternative to `/auth/register` for user registration
- Password is automatically hashed using bcrypt
- `role` is optional (defaults to "user")
- Regular users cannot set role to "admin" - only existing admins can create admin accounts
- Unlike `/auth/register`, this does not automatically set the JWT cookie (use `/auth/login` after registration)

---

#### Update User
Update user information (owner or admin only).

**Endpoint:** `PUT /users/:id`

**Authentication:** Required (Owner or Admin)

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Updated",
  "password": "newPassword123",
  "role": "user"
}
```

**Notes:**
- `password` is optional - only include if changing password
- All other fields are required

**Response:** `200 OK`
```json
{
  "user_id": 1,
  "first_name": "John",
  "last_name": "Updated",
  "role": "user",
  "created_at": "2026-01-21T10:00:00.000Z",
  "updated_at": "2026-01-21T11:00:00.000Z"
}
```

---

#### Delete User
Soft delete a user (admin only).

**Endpoint:** `DELETE /users/:id`

**Authentication:** Required (Admin only)

**Response:** `200 OK`
```json
{
  "message": "User deleted successfully"
}
```

---

### Category Routes

Categories are user-specific. Each user manages their own categories.

#### Get All Categories
Retrieve categories (users see their own, admins see all).

**Endpoint:** `GET /categories`

**Authentication:** Required

**Response:** `200 OK`
```json
[
  {
    "category_id": 1,
    "user_id": 1,
    "name": "Food",
    "description": "Groceries and dining out",
    "created_at": "2026-01-21T10:00:00.000Z",
    "updated_at": "2026-01-21T10:00:00.000Z"
  },
  {
    "category_id": 2,
    "user_id": 1,
    "name": "Transport",
    "description": "Gas and public transport",
    "created_at": "2026-01-21T10:05:00.000Z",
    "updated_at": "2026-01-21T10:05:00.000Z"
  }
]
```

---

#### Get Category by ID
Retrieve a specific category (owner or admin only).

**Endpoint:** `GET /categories/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "category_id": 1,
  "user_id": 1,
  "name": "Food",
  "description": "Groceries and dining out",
  "created_at": "2026-01-21T10:00:00.000Z",
  "updated_at": "2026-01-21T10:00:00.000Z"
}
```

**Error Response:** `404 Not Found`
```json
{
  "error": "Category not found"
}
```

---

#### Create Category
Create a new category.

**Endpoint:** `POST /categories`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Entertainment",
  "description": "Movies, games, subscriptions"
}
```

**Response:** `201 Created`
```json
{
  "category_id": 3,
  "user_id": 1,
  "name": "Entertainment",
  "description": "Movies, games, subscriptions",
  "created_at": "2026-01-21T11:00:00.000Z",
  "updated_at": "2026-01-21T11:00:00.000Z"
}
```

**Notes:**
- `user_id` is automatically set from authenticated user
- Category names must be unique per user
- `description` is optional

**Error Response:** `400 Bad Request`
```json
{
  "error": "Category with this name already exists for this user"
}
```

---

#### Update Category
Update an existing category (owner or admin only).

**Endpoint:** `PUT /categories/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Entertainment",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "category_id": 3,
  "user_id": 1,
  "name": "Entertainment",
  "description": "Updated description",
  "created_at": "2026-01-21T11:00:00.000Z",
  "updated_at": "2026-01-21T11:30:00.000Z"
}
```

---

#### Delete Category
Soft delete a category (owner or admin only).

**Endpoint:** `DELETE /categories/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Category deleted successfully"
}
```

---

### Expense Routes

#### Get All Expenses
Retrieve all expenses (admin only - regular users should filter by user_id).

**Endpoint:** `GET /expenses`

**Authentication:** Required (Admin only)

**Response:** `200 OK`
```json
[
  {
    "expense_id": 1,
    "user_id": 1,
    "expense_date": "2026-01-20",
    "amount": "45.50",
    "description": "Grocery shopping",
    "created_at": "2026-01-21T10:00:00.000Z",
    "updated_at": "2026-01-21T10:00:00.000Z",
    "categories": "Food,Household"
  }
]
```

---

#### Get Expense by ID
Retrieve a specific expense (owner or admin only).

**Endpoint:** `GET /expenses/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "expense_id": 1,
  "user_id": 1,
  "expense_date": "2026-01-20",
  "amount": "45.50",
  "description": "Grocery shopping",
  "created_at": "2026-01-21T10:00:00.000Z",
  "updated_at": "2026-01-21T10:00:00.000Z",
  "category_ids": "1,2",
  "categories": "Food,Household"
}
```

**Error Response:** `403 Forbidden`
```json
{
  "error": "Access denied. You can only access your own expenses."
}
```

---

#### Create Expense
Create a new expense.

**Endpoint:** `POST /expenses`

**Authentication:** Required

**Request Body:**
```json
{
  "user_id": 1,
  "expense_date": "2026-01-21",
  "amount": 25.99,
  "description": "Lunch at restaurant",
  "category_ids": [1, 3]
}
```

**Response:** `201 Created`
```json
{
  "expense_id": 2,
  "user_id": 1,
  "expense_date": "2026-01-21",
  "amount": "25.99",
  "description": "Lunch at restaurant",
  "created_at": "2026-01-21T12:00:00.000Z",
  "updated_at": "2026-01-21T12:00:00.000Z",
  "category_ids": "1,3",
  "categories": "Food,Entertainment"
}
```

**Notes:**
- Users can only create expenses for themselves (unless admin)
- `expense_date` format: YYYY-MM-DD
- `amount` must be a positive number
- `category_ids` is optional (array of category IDs)
- `description` is optional

**Validation Errors:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "details": [
    "Field 'amount' must be a number",
    "Must be a positive number",
    "Invalid date format. Use YYYY-MM-DD"
  ]
}
```

---

#### Update Expense
Update an existing expense (owner or admin only).

**Endpoint:** `PUT /expenses/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "user_id": 1,
  "expense_date": "2026-01-21",
  "amount": 30.00,
  "description": "Lunch at restaurant (updated)",
  "category_ids": [1]
}
```

**Response:** `200 OK`
```json
{
  "expense_id": 2,
  "user_id": 1,
  "expense_date": "2026-01-21",
  "amount": "30.00",
  "description": "Lunch at restaurant (updated)",
  "created_at": "2026-01-21T12:00:00.000Z",
  "updated_at": "2026-01-21T13:00:00.000Z",
  "category_ids": "1",
  "categories": "Food"
}
```

---

#### Delete Expense
Soft delete an expense (owner or admin only).

**Endpoint:** `DELETE /expenses/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Expense deleted successfully"
}
```

**Error Response:** `403 Forbidden`
```json
{
  "error": "Access denied. You can only delete your own expenses."
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message description"
}
```

### Validation Error Response Format
```json
{
  "error": "Validation failed",
  "details": [
    "Field 'name' is required",
    "Field 'amount' must be a number"
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or malformed request |
| 401 | Unauthorized - Authentication required or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server error |

---

## Database Schema

### Users Table
```sql
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_yn` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`user_id`)
);
```

### Categories Table
```sql
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_yn` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_user_category` (`user_id`,`name`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
);
```

### Expenses Table
```sql
CREATE TABLE `expenses` (
  `expense_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `expense_date` date NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_yn` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`expense_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
);
```

### Expense_Category Junction Table
```sql
CREATE TABLE `expense_category` (
  `expense_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_yn` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`expense_id`,`category_id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`expense_id`)
);
```

---

## Security Features

### Password Security
- Passwords hashed using **bcrypt** with salt rounds of 10
- Never stored or transmitted in plain text
- Password hashes excluded from API responses

### JWT Security
- Tokens signed with secret key
- 24-hour expiration (configurable)
- Stored in HTTP-only cookies (not accessible via JavaScript)
- Prevents XSS attacks

### Cookie Security
- **HttpOnly**: Prevents JavaScript access
- **SameSite=Strict**: Prevents CSRF attacks
- **Secure flag**: HTTPS-only in production
- Automatic cleanup on logout

### CORS Configuration
- Configured allowed origins
- Credentials support enabled
- Specific HTTP methods allowed
- Prevents unauthorized cross-origin requests

### Data Validation
- Input validation on all endpoints
- Type checking
- Custom validators (positive numbers, date formats, etc.)
- SQL injection prevention via parameterized queries

### Soft Deletes
- Resources marked as deleted (`deleted_yn = 1`) instead of permanent deletion
- Data retention for audit purposes
- Can be restored if needed

---

## Rate Limiting (Future Enhancement)

Consider implementing rate limiting for production:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/v1/', limiter);
```

---

## Testing the API

### Registration Options

You have **two ways** to register users:

1. **Using `/auth/register` (Recommended for frontend):**
   - Automatically logs user in
   - Sets JWT cookie
   - User can immediately make authenticated requests

2. **Using `/users` (Alternative):**
   - Creates user account only
   - Requires separate login via `/auth/login`
   - Useful if you want to separate registration and login flows

### Using cURL

**Register (with auto-login):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe","password":"pass123"}' \
  -c cookies.txt
```

**Register (without auto-login):**
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Jane","last_name":"Smith","password":"pass456"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","password":"pass123"}' \
  -c cookies.txt
```

**Get Categories (with cookie):**
```bash
curl http://localhost:3000/api/v1/categories \
  -b cookies.txt
```

### Using Postman
1. Send register request to `/auth/register` or `/users`
2. If using `/users`, follow with login request to `/auth/login`
3. Cookie automatically stored in Postman
4. Subsequent requests automatically include cookie
5. No manual Authorization header needed

---

## Support

For issues or questions:
- Check this documentation
- Review error messages carefully
- Ensure all required fields are provided
- Verify authentication credentials are included

## Version
**API Version:** 1.0.0  
**Last Updated:** January 21, 2026
