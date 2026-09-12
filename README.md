# NestNotes Flat Sharing

## Project Description
NestNotes is a flat-sharing application that allows users to view and add rental listings through a REST API built with Node.js and Express.

## Features
- View all listings
- View a listing by ID
- Add a new listing
- Data persistence using JSON storage
- Unit testing with Jest and Supertest

## Tech Stack
- Node.js
- Express.js
- Jest
- Supertest

## Installation

```bash
npm install
```

## Run the Server

```bash
node server.js
```

Server runs on:

```text
http://localhost:3000
```

## Run Tests

```bash
npm test
```

## API Endpoints

### Get All Listings

```http
GET /api/listings
```

### Get Listing by ID

```http
GET /api/listings/:id
```

### Create New Listing

```http
POST /api/listings
Content-Type: application/json
```

Example Request Body:

```json
{
  "title": "2BHK Koramangala",
  "price": 12000
}
```

## Project Structure

```text
backend/
├── data/
│   └── listings.json
├── routes/
│   └── listings.js
├── tests/
│   └── listings.test.js
├── server.js
├── package.json
```

## Test Results

- GET /api/listings ✔
- GET /api/listings/1 ✔

All tests passed successfully using Jest and Supertest.