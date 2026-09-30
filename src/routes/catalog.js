import { Router } from 'express';
import Category from '../models/Category.js';
import Skill from '../models/Skill.js';
import Location from '../models/Location.js';
import { auth, admin } from '../middleware/auth.js';
import { slugify } from '../utils/slug.js';

const r=Router();
r.get('/categories',async(req,res)=>res.json({categories:await Category.find({active:true}).sort({name:1})}));
r.get('/categories/:id/skills',async(req,res)=>res.json({skills:await Skill.find({category:req.params.id,active:true}).sort({name:1})}));
r.post('/categories',auth,admin,async(req,res)=>{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Category name is required'});const c=await Category.create({name,slug:slugify(name),description:req.body.description||'',icon:req.body.icon||''});res.status(201).json({category:c});});
r.patch('/categories/:id',auth,admin,async(req,res)=>{const c=await Category.findByIdAndUpdate(req.params.id,{$set:{...(req.body.name?{name:req.body.name,slug:slugify(req.body.name)}:{}),...(req.body.description!==undefined?{description:req.body.description}:{}),...(req.body.active!==undefined?{active:Boolean(req.body.active)}:{})}},{new:true});res.json({category:c});});
r.post('/categories/:id/skills',auth,admin,async(req,res)=>{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Skill name is required'});const s=await Skill.create({category:req.params.id,name,slug:slugify(name)});res.status(201).json({skill:s});});
r.patch('/skills/:id',auth,admin,async(req,res)=>{const s=await Skill.findByIdAndUpdate(req.params.id,{$set:{...(req.body.name?{name:req.body.name,slug:slugify(req.body.name)}:{}),...(req.body.active!==undefined?{active:Boolean(req.body.active)}:{})}},{new:true});res.json({skill:s});});
r.get('/locations',async(req,res)=>{const state=String(req.query.state||'Maharashtra');const district=String(req.query.district||'');const taluka=String(req.query.taluka||'');const rows=await Location.find({state,active:true,...(district?{district}:{}),...(taluka?{taluka}:{})}).sort({district:1,taluka:1,locality:1}).lean();const districts=[...new Set(rows.map(x=>x.district))];const talukas=[...new Set(rows.filter(x=>!district||x.district===district).map(x=>x.taluka))];const localities=[...new Set(rows.filter(x=>(!district||x.district===district)&&(!taluka||x.taluka===taluka)).map(x=>x.locality).filter(Boolean))];res.json({state,districts,talukas,localities});});
r.post('/locations',auth,admin,async(req,res)=>{const row=await Location.create({state:req.body.state||'Maharashtra',district:req.body.district,taluka:req.body.taluka,locality:req.body.locality||''});res.status(201).json({location:row});});
export default r;
