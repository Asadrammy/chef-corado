<a id="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="public/github.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Shadcn UI Kit</h3>

  <p align="center">
    Shadcn UI Kit is a comprehensive collection of ready-to-use admin dashboards, website templates, and customizable components.
    <br />
    <br />
    <a href="https://shadcnuikit.com/">Home Page</a>
    &nbsp;&bull;&nbsp;
    <a href="https://shadcnuikit.com/dashboard/default">Dashboards</a>
    &nbsp;&bull;&nbsp;
    <a href="https://shadcnuikit.com/templates">Templates</a>
    &nbsp;&bull;&nbsp;
    <a href="https://free.shadcnuikit.com/">Free</a>
  </p>
    <br />
</div>

## 💎 About Shadcn UI Kit

**Shadcn UI Kit** is a comprehensive and versatile collection of ready-to-use admin dashboards, website templates, and fully customizable components designed for modern web applications. It goes beyond standard UI libraries by offering enhanced functionality, greater design flexibility, and a seamless user experience. Whether you're building complex admin panels or sleek landing pages, Shadcn UI Kit provides the tools you need to create visually appealing and highly functional interfaces with ease.

<img src="public/preview.png" alt="shadcn free dashboard preview 1" width="100%">
<img src="public/preview2.png" alt="shadcn free dashboard preview 2" width="100%">

## 🪄 Get Lifetime Access (PRO)

Get lifetime use of the premium version of Shadcn UI Kit with hundreds of UI components, dashboards, website templates and pre-built pages. Free updates, newly added components and templates are also included.

| Free Version   | [Shadcn UI Kit PRO](https://shadcnuikit.com/pricing) |
| -------------- | ---------------------------------------------------- |
| 1 Dashboard    | ✔ 10 Dashboards                                     |
| 5+ Pages       | ✔ 50+ Pages                                         |
| 1 Color Scheme | ✔ 10+ Web Apps                                      |
|                | ✔ 100+ Premium Components                           |
|                | ✔ Premium Templates                                 |
|                | ✔ 5+ Color Schemes                                  |
|                | ✔ Theme Customization                               |
|                | ✔ Dark/Light Mode 🌙                                |
|                | ✔ LTR/RTL Support                                   |
|                | ✔ New Sidebar                                       |
|                | ✔ Multiple Layouts                                  |
|                | ✔ and more..                                        |

✅ [Click here](https://shadcnuikit.com/pricing) to get the Shadcn UI Kit and review it in detail

## ✉️ Contact

Toby Belhome - [@TobyBelhome](https://x.com/TobyBelhome)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker (for local PostgreSQL)
- PostgreSQL (or use Docker)

### Database Setup

This project uses PostgreSQL for both local development and production (Render).

#### Option 1: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker ps
```

#### Option 2: Local PostgreSQL Installation

If you have PostgreSQL installed locally, create a database:

```bash
createdb chef_marketplace
```

Then update your `.env` file with your connection string.

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chef_marketplace"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### Installation & Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npm run migrate

# Seed database (optional - creates test data)
npm run seed

# Start development server
npm run dev
```

### Deployment to Render

1. **Push schema changes to PostgreSQL**:
   - The schema has been updated from SQLite to PostgreSQL
   - Commit the changes to `prisma/schema.prisma`

2. **Configure Render environment variables**:
   - Render automatically provides `DATABASE_URL` (PostgreSQL)
   - Set `NEXTAUTH_URL=https://chef-management.onrender.com`
   - Set `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
   - Set `NODE_ENV=production`
   - Configure Stripe keys if using payments

3. **Deploy**:
   - Push your changes to Git
   - Render will automatically build and deploy
   - Prisma migrations will run automatically during build

### Test Accounts

After seeding, you can use these accounts:
- **Admin**: admin@example.com / admin123
- **Chef**: chef@example.com / chef123
- **Client**: client@example.com / client123

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Push database schema changes
- `npm run seed` - Seed database with test data

<p align="right">(<a href="#readme-top">back to top</a>)</p>
