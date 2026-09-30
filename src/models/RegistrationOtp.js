import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: {type:String, required:true},
  mobile: {type:String, required:true},
  age: {type:Number, min:18, max:120, required:true},
  gender: {type:String, enum:['male','female','other'], required:true},
  email: {type:String, required:true, lowercase:true},
  passwordHash: {type:String,required:true},
  otpHash: {type:String,required:true},
  otpExpiresAt: {type:Date,required:true},
  imagePath: {type:String, default:''},
  imageData: {type:Buffer, default:null},
  imageContentType: {type:String, default:''},
  role: {type:String, enum:['customer','worker'], default:'customer'},
  profession: {type:String, default:''},
  skillNames: [{type:String, trim:true}],
  experienceYears: {type:Number, min:0, max:70, default:0},
  district: {type:String, default:''},
  taluka: {type:String, default:''},
  city: {type:String, default:''},
  area: {type:String, default:''},
  bio: {type:String, default:''},
  languages: [{type:String, trim:true}],
  verificationUploads: [{
    type: {type:String, enum:['id','experience_certificate','skill_certificate','other']},
    fileName: String, contentType: String, size: Number, storageKey: String
  }],
  createdAt: {type:Date, default:Date.now, expires:900}
});
export default mongoose.model('RegistrationOtp', schema);
