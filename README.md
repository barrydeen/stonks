# Stonks - Private Portfolio Tracking Application

A private, self-hosted portfolio tracking application built with Next.js that allows you to monitor your investments, track performance, and analyze your portfolio using real-time market data.

## Features

- 📈 Real-time stock price tracking
- 💼 Portfolio management and performance tracking
- 📊 Investment analytics and visualization
- 🔐 Private and secure - self-hosted solution
- 🚀 Built with modern technologies (Next.js, Prisma, PostgreSQL)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- Docker and Docker Compose
- npm or yarn package manager

## API Keys Setup

This application requires API keys from the following services:

1. **Alpha Vantage API**
   - Sign up at [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Get your API key
   
2. **Financial Modeling Prep (FMP)**
   - Sign up at [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/)
   - Get your API key

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL="postgresql://stonks:stonks123@localhost:8832/stonks"
ALPHA_VANTAGE_API_KEY="your_alpha_vantage_api_key"
FMP_API_KEY="your_fmp_api_key"
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stonks
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

## Database Setup

1. Start the PostgreSQL database using Docker:
```bash
docker-compose up -d
```

2. Run database migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

## Development

1. Start the development server:
```bash
npm run dev
# or
yarn dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Building for Production

1. Build the application:
```bash
npm run build
# or
yarn build
```

2. Start the production server:
```bash
npm run start
# or
yarn start
```

## Database Management

Common Prisma commands you might need:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

## Docker Database Commands

```bash
# Start the database
docker-compose up -d

# Stop the database
docker-compose down

# View database logs
docker-compose logs -f postgres

# Reset database volume
docker-compose down -v
```

## Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL="postgresql://stonks:stonks123@localhost:8832/stonks"
ALPHA_VANTAGE_API_KEY="your_alpha_vantage_api_key"
FMP_API_KEY="your_fmp_api_key"
```

## Troubleshooting

1. If the database connection fails:
   - Ensure Docker is running
   - Check if the database container is up with `docker ps`
   - Verify the DATABASE_URL in your `.env` file

2. If API calls fail:
   - Verify your API keys are correctly set in the `.env` file
   - Check API rate limits
   - Ensure you have an active internet connection

## License

This is a private application. All rights reserved.
