# Mini CRM Backend

This is the backend service for the Mini CRM application. It is built with Node.js, Express, and MongoDB.

## Features

- User authentication with Passport.js and JWT
- Google OAuth 2.0 authentication
- RESTful API endpoints for managing customers, orders, segments, campaigns, and communication logs
- Secure session management
- Input validation and error handling
- Integration with Google Generative AI and OpenAI clients for advanced features

## Prerequisites

- Node.js (v16 or higher recommended)
- MongoDB instance (local or cloud)
- Environment variables configured (see below)

## Environment Variables

Create a `.env` file in the `mini-crm/backend` directory with the following variables:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
```

## Installation

1. Navigate to the backend directory:

```bash
cd mini-crm/backend
```

2. Install dependencies:

```bash
npm install
```

## Running the Server

- To start the server in production mode:

```bash
npm start
```

- To start the server in development mode with auto-reloading (requires `nodemon`):

```bash
npm run dev
```

The server will start on the port specified in the `.env` file (default is 5000).

## API Endpoints

- `/api/auth` - Authentication routes (login, logout, register)
- `/api/auth/google` - Google OAuth routes
- `/api/customers` - Customer management
- `/api/orders` - Order management
- `/api/segments` - Customer segmentation
- `/api/campaigns` - Campaign management
- `/api/communicationLog` - Communication logs

Refer to the source code in the `routes` and `controllers` directories for detailed implementation.

## Database

The backend uses MongoDB with Mongoose ODM. The connection is established in `config/db.js`.

## Middleware

- Authentication middleware is in `middleware/auth.js`.
- Error handling middleware is in `middleware/errorMiddleware.js`.

## Security

- Uses `helmet` for setting secure HTTP headers.
- Uses `cors` for Cross-Origin Resource Sharing.
- Sessions are managed securely with `express-session`.

## Logging and Error Handling

- Uncaught exceptions and unhandled promise rejections are logged and cause the server to exit gracefully.

## Deployment

- Ensure environment variables are set in your deployment environment.
- Use `npm start` to run the server.
- Common deployment platforms: Heroku, AWS Elastic Beanstalk, DigitalOcean, etc.

## Architecture Diagram

*Placeholder for architecture diagram.*

(Add an architecture diagram image or link here if available.)

## Summary of AI Tools and Other Technologies Used

- AI Tools:
  - OpenAI API (via `openaiClient.js`)
  - Google Generative AI Client (via `googleGenerativeAIClient.js`)
- Backend Technologies:
  - Node.js
  - Express
  - MongoDB with Mongoose
  - Passport.js for authentication
  - JWT for token management

## Known Limitations or Assumptions

- The backend requires a properly configured MongoDB instance.
- Environment variables must be correctly set for authentication and database connection.
- Some API endpoints may require additional permissions or roles.
- Error handling and logging are basic and may need enhancement for production use.

## Contributing

Feel free to open issues or submit pull requests.

## License

This project is licensed under the ISC License.
