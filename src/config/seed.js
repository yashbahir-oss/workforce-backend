import Category from '../models/Category.js';
import Skill from '../models/Skill.js';
import { slugify } from '../utils/slug.js';
const defaults={
  Festival:['Decorator','Event Helper','Catering Helper'],
  Marriage:['Waiter','Decorator','Catering Helper','Event Staff'],
  Hotel:['Waiter','Kitchen Helper','Housekeeping','Reception Support'],
  Function:['Event Staff','Catering','Setup Helper'],
  Event:['Event Staff','Stage Helper','Decorator'],
  Catering:['Cook','Waiter','Kitchen Helper','Serving Staff'],
  'Daily Labour':['General Helper','Loader','Site Helper'],
  Teacher:['Primary Teacher','Tutor','Subject Teacher'],
  Mechanic:['Two Wheeler Mechanic','Car Mechanic','General Mechanic'],
  Construction:['Mason','Painter','Electrician Helper','Construction Helper'],
  Cleaning:['Home Cleaner','Office Cleaner','Deep Cleaning'],
  Security:['Security Guard','Event Security'],
  Delivery:['Delivery Partner','Parcel Handler'],
  Driver:['Car Driver','Commercial Driver','Delivery Driver'],
  Electrician:['Residential Electrician','Industrial Electrician','Wiring Technician'],
  Plumber:['Plumber','Pipe Fitter','Maintenance Plumber'],
  Artist:['Painter','Photographer','Musician','Performer']
};
export async function seedCatalog(){for(const [name,skills] of Object.entries(defaults)){const c=await Category.findOneAndUpdate({slug:slugify(name)},{$setOnInsert:{name,slug:slugify(name)}},{upsert:true,new:true});for(const skill of skills)await Skill.findOneAndUpdate({category:c._id,slug:slugify(skill)},{$setOnInsert:{category:c._id,name:skill,slug:slugify(skill)}},{upsert:true});}}
