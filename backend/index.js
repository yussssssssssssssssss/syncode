const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const protect = require('./middleware/auth.middleware.js')
const authRoutes = require('./routes/auth.routes.js');
const roomRoutes = require('./routes/room.routes.js');


const app = express();
const PORT = 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({extended:true}));



app.use('/api/auth', authRoutes);
app.use('/api/room', protect, roomRoutes);



app.listen(PORT, ()=> {
    console.log(`http://localhost:${PORT}`);
})