import { Router } from 'express';
import Notification from '../models/Notification.js';
import { auth } from '../middleware/auth.js';
const r=Router();
r.get('/',auth,async(req,res)=>{const notifications=await Notification.find({user:req.user._id}).sort({createdAt:-1}).limit(100);res.json({notifications:notifications.map(n=>({...n.toObject(),id:n._id,read:Boolean(n.readAt)})),unreadCount:await Notification.countDocuments({user:req.user._id,readAt:null})});});
r.patch('/:id/read',auth,async(req,res)=>{await Notification.updateOne({_id:req.params.id,user:req.user._id},{readAt:new Date()});res.json({ok:true});});
r.post('/read-all',auth,async(req,res)=>{await Notification.updateMany({user:req.user._id,readAt:null},{readAt:new Date()});res.json({ok:true});});
export default r;
