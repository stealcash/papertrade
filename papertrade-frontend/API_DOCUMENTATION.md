# API Documentation for PaperTrade Frontend

## Base URL
- Default: `http://localhost:8000/api/v1`
- Environment: `NEXT_PUBLIC_API_BASE`

## Response Format
All responses follow this structure:
```json
{
  "status": "success" | "error",
  "message": "string",
  "data": { ... },
  "timestamp": "ISO string"
}
```

## Authentication APIs

### POST /auth/signup
**Request:**
```json
{
  "email": "string",
  "password": "string",
  "mobile": "string (optional)"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": number,
      "email": "string",
      "role": "string",
      "wallet_balance": "string"
    },
    "token": "string"
  }
}
```

### POST /auth/login
**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** Same as signup

### GET /auth/profile
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "status": "success",
  "data": { user object }
}
```

## Stocks APIs

### GET /stocks/
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": number,
      "symbol": "string",
      "full_symbol": "string",
      "enum": "string",
      "exchange_suffix": "string",
      "status": "active" | "inactive"
    }
  ]
}
```

### GET /stocks/{id}
**Response:** Single stock object

## Backtest APIs

### POST /backtest/run
**Request:**
```json
{
  "stock_id": "string",
  "strategy_type": "sma_crossover" | "rsi" | "macd",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "initial_capital": "string"
}
```

### GET /backtest/runs/
**Response:**
```json
{
  "status": "success",
  "data": [ backtest run objects ]
}
```

## Strategies APIs

### GET /strategies/predefined/
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": number,
      "name": "string",
      "description": "string"
    }
  ]
}
```

## Payments APIs

### POST /payments/wallet/refill
**Request:**
```json
{
  "amount": number
}
```

### GET /payments/records/
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": number,
      "amount": number,
      "description": "string",
      "created_at": "ISO string"
    }
  ]
}
```

## Admin APIs

### GET /adminpanel/dashboard-analytics
**Response:**
```json
{
  "status": "success",
  "data": {
    "total_users": number,
    "active_backtests": number,
    "total_strategies": number,
    "last_sync": "string"
  }
}
```

