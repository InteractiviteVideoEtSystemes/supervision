export default () => ({
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'supervision',
    password: process.env.DB_PASSWORD ?? 'supervision',
    name: process.env.DB_NAME ?? 'supervision',
  },
  jwtSecret: process.env.JWT_SECRET ?? 'changeme_jwt_secret_in_production',
  port: Number(process.env.PORT ?? 3000),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
});
