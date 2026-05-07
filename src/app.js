const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRouter = require('./routes/health.routes');
const authRouter = require('./routes/auth.routes');
const adminRouter = require('./routes/admin.routes');
const servicesRouter = require('./routes/services.routes');
const favoritesRouter = require('./routes/favorites.routes');
const reviewsRouter = require('./routes/reviews.routes');
const bookingsRouter = require('./routes/bookings.routes');
const interactionsRouter = require('./routes/interactions.routes');
const toursRouter = require('./routes/tours.routes');
const recommendationsRouter = require('./routes/recommendations.routes');
const profileRouter = require('./routes/profile.routes');
const { errorMiddleware } = require('./middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({
    service: 'MakeTrip API',
    status: 'ok',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/services', servicesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/tours', toursRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/profile', profileRouter);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorMiddleware);

module.exports = app;
