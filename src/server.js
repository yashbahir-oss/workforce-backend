import dotenv from 'dotenv';
dotenv.config();
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import WorkerProfile from './models/WorkerProfile.js';
import { hashPassword } from './utils/auth.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import complaintRoutes from './routes/complaints.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import workerRoutes from './routes/workers.js';
import jobRoutes from './routes/jobs.js';
import bookingRoutes from './routes/bookings.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import catalogRoutes from './routes/catalog.js';
import { auth } from './middleware/auth.js';
import { setIO } from './services/socket.js';
import { seedCatalog } from './config/seed.js';
import { connectRedis, redisStatus, closeRedis } from './services/redis.js';

const app=express();
const server=http.createServer(app);
const clientUrl=process.env.CLIENT_URL||'http://localhost:5173';
const logger=pino({level:process.env.LOG_LEVEL||'info'});
app.set('trust proxy',1);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:clientUrl,credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));
app.use(express.json({limit:'2mb'}));app.use(cookieParser());app.use(pinoHttp({logger}));
app.use(rateLimit({windowMs:15*60*1000,max:Number(process.env.RATE_LIMIT_MAX||500),standardHeaders:true,legacyHeaders:false}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,max:Number(process.env.AUTH_RATE_LIMIT_MAX||100)}));

app.get('/api/health',(req,res)=>res.json({success:true,ok:true,service:'WORKFORCE API',status:'ok',database:'mongodb-atlas',redis:redisStatus(),version:'v1'}));
app.use('/api/v1/auth',authRoutes);app.use('/api/auth',authRoutes);
app.use('/api/v1/profile',profileRoutes);app.use('/api/profile',profileRoutes);
app.use('/api/v1/complaints',complaintRoutes);app.use('/api/complaints',complaintRoutes);
app.use('/api/v1/ai',aiRoutes);app.use('/api/ai',aiRoutes);
app.use('/api/v1/admin',adminRoutes);app.use('/api/admin',adminRoutes);
app.use('/api/v1/workers',workerRoutes);app.use('/api/workers',workerRoutes);
app.use('/api/v1/jobs',jobRoutes);app.use('/api/jobs',jobRoutes);
app.use('/api/v1/bookings',bookingRoutes);app.use('/api/bookings',bookingRoutes);
app.use('/api/v1/messages',messageRoutes);app.use('/api/messages',messageRoutes);
app.use('/api/v1/reviews',reviewRoutes);app.use('/api/reviews',reviewRoutes);
app.use('/api/v1/notifications',notificationRoutes);app.use('/api/notifications',notificationRoutes);
app.use('/api/v1/catalog',catalogRoutes);app.use('/api/catalog',catalogRoutes);

app.use((err,req,res,next)=>{req.log?.error(err);const status=err?.status || (err?.code?.startsWith?.('LIMIT_') ? 400 : 500);res.status(status).json({message:err.message||'Internal server error'});});

const io=new Server(server,{cors:{origin:clientUrl,credentials:true}});
io.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token||socket.handshake.headers?.authorization?.replace('Bearer ','');if(!token)return next(new Error('Authentication required'));const jwt=(await import('jsonwebtoken')).default;const payload=jwt.verify(token,process.env.JWT_SECRET);const user=await User.findById(payload.id).select('_id role status name');if(!user||user.status!=='active')return next(new Error('Invalid user'));socket.user=user;next();}catch(e){next(new Error('Invalid socket session'));}});
io.on('connection',socket=>{socket.join(`user:${socket.user._id}`);socket.on('conversation:join',key=>{if(typeof key==='string'&&key.length<200)socket.join(`conversation:${key}`);});});setIO(io);

if(!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');if(!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

async function seedAdmin(){if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)return;const email=process.env.ADMIN_EMAIL.toLowerCase();const existing=await User.findOne({email});if(!existing){await User.create({name:process.env.ADMIN_NAME||'WORKFORCE Admin',email,passwordHash:await hashPassword(process.env.ADMIN_PASSWORD),role:'admin'});console.log('WORKFORCE admin account seeded');}}
async function migrateRoles(){await User.updateMany({role:'user'},{$set:{role:'customer'}});}
connectDB(process.env.MONGODB_URI).then(async()=>{await connectRedis(); await migrateRoles();await seedCatalog();await seedAdmin();const port=Number(process.env.PORT||4000);server.listen(port,()=>console.log(`WORKFORCE API running on http://localhost:${port}`));}).catch(e=>{console.error('Database connection failed:',e.message);process.exit(1);});

const shutdown = async () => { server.close(); await closeRedis(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
