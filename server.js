/**
 * Express server that adapts Vercel serverless functions for Railway deployment.
 * Each file in api/ is mounted as an Express route.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

/**
 * Recursively scan the api/ directory and register routes.
 * Converts file paths to Express routes:
 *   api/auth/login.js -> /api/auth/login
 *   api/appointments/[id].js -> /api/appointments/:id
 *   api/appointments/[id]/cancel.js -> /api/appointments/:id/cancel
 */
function registerRoutes(dir, basePath = '/api') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Convert [param] to :param for Express
      const routeSegment = entry.name.replace(/\[(\w+)\]/g, ':$1');
      registerRoutes(fullPath, `${basePath}/${routeSegment}`);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const handler = require(fullPath);
      let routeName = entry.name.replace('.js', '');

      // index.js maps to the parent path
      if (routeName === 'index') {
        routeName = '';
      } else {
        // Convert [param] to :param
        routeName = routeName.replace(/\[(\w+)\]/g, ':$1');
      }

      const route = routeName ? `${basePath}/${routeName}` : basePath;

      // Register all methods for this route
      app.all(route, (req, res) => {
        // Add query params from Express to match Vercel format
        // In Vercel, dynamic route params are in req.query
        if (req.params) {
          req.query = { ...req.query, ...req.params };
        }
        return handler(req, res);
      });

      console.log(`  Route: ${route}`);
    }
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register all API routes
console.log('Registering routes...');
const apiDir = path.join(__dirname, 'api');
if (fs.existsSync(apiDir)) {
  registerRoutes(apiDir);
}
console.log('Routes registered.\n');

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Endpoint no encontrado' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`FichaDoctor Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
