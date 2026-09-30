import mongoose from 'mongoose';
const schema=new mongoose.Schema({complaintId:{type:String,unique:true,index:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},subject:{type:String,required:true},description:{type:String,required:true},category:{type:String,default:'General'},status:{type:String,enum:['Submitted','In Review','Resolved','Rejected'],default:'Submitted'},notes:{type:String,default:''}},{timestamps:true});
export default mongoose.model('Complaint',schema);
