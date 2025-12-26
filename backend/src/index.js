const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

require('./config/db');

const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});