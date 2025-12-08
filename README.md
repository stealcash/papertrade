# PaperTrade - Paper Trading Platform for Indian Stocks

A comprehensive paper trading platform built with Django, Next.js, and Go for practicing stock trading without real money.

## 📁 Project Structure

```
papertrade/
├── papertrade-backend/         # Django REST API (Port 8000)
├── papertrade-backend-go/      # Go data service (Port 8080)
├── papertrade-frontend/        # User-facing Next.js app (Port 3000)
├── papertrade-frontend-admin/  # Admin portal Next.js app (Port 4000)
├── docker/                     # Docker configurations
└── scripts/                    # Setup and run scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

Run the automated setup script:
```bash
cd scripts
./restart.sh
```

This will install all dependencies and run migrations.

### 2. Create Superadmin

```bash
cd scripts
./create-superadmin.sh
```

Follow prompts to set email and password.

### 3. Start Services

Use individual scripts for each service:

**Terminal 1 - Django Backend:**
```bash
cd scripts
./run-django.sh
```

**Terminal 2 - Go Service:**
```bash
cd scripts
./run-go.sh
```

**Terminal 3 - User Frontend:**
```bash
cd scripts
./run-frontend.sh
```

**Terminal 4 - Admin Frontend (Optional):**
```bash
cd scripts
./run-admin-frontend.sh
```

## 📍 Access Points

- **User App**: http://localhost:3000
- **Admin Portal**: http://localhost:4000
- **Django API**: http://localhost:8000/api/v1
- **API Docs (Swagger)**: http://localhost:8000/api/v1/docs
- **Go Service**: http://localhost:8080/api/v1

## 🔐 Default Credentials

Use the credentials you set during `create-superadmin.sh`:
- **User App Login**: http://localhost:3000/login
- **Admin Portal Login**: http://localhost:4000/login

## 🎯 Features

### User Features (Port 3000)
- 📈 Browse Indian stocks (NIFTY 50, Bank NIFTY, IT)
- 🔬 Run backtests with multiple strategies
- 🎯 Create custom trading strategies
- 💰 Virtual wallet (₹100,000)
- 📊 Analytics dashboard
- 📥 CSV exports

### Admin Features (Port 4000)
- 👥 User management
- ⚙️ System configuration (Superadmin only)
- 📊 Platform analytics
- 🔄 Data sync controls

## 🛠️ Development

### Scripts Available

All scripts are in the `scripts/` directory:
- `restart.sh` - Full setup (dependencies + migrations)
- `run-django.sh` - Start Django backend
- `run-go.sh` - Start Go service
- `run-frontend.sh` - Start user frontend
- `run-admin-frontend.sh` - Start admin portal
- `create-superadmin.sh` - Create admin user

### Manual Commands

**Django:**
```bash
cd papertrade-backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**Go:**
```bash
cd papertrade-backend-go
go run cmd/main.go
```

**Frontend:**
```bash
cd papertrade-frontend
npm run dev
```

**Admin:**
```bash
cd papertrade-frontend-admin
npm run dev
```

## 📋 Prerequisites

- Node.js 18+
- Python 3.11+
- Go 1.21+
- PostgreSQL 15+ (or use Neon cloud)
- Redis 7+ (or use Upstash cloud)

## 🧪 Testing

**Django:**
```bash
cd papertrade-backend
source venv/bin/activate
pytest
```

**Go:**
```bash
cd papertrade-backend-go
go test ./...
```

**Frontend:**
```bash
cd papertrade-frontend
npm test
```

## 📦 Technology Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS, Redux Toolkit
- **Backend**: Django 5.0, Django REST Framework, Celery
- **Data Service**: Go with Gin framework
- **Database**: PostgreSQL (Neon)
- **Cache**: Redis (Upstash)
- **Testing**: Jest, Pytest

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

## 📄 License

[Your License Here]

## 🆘 Support

For issues, open a GitHub issue.
