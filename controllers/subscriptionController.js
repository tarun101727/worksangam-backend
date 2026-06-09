import User from "../models/User.js";
import Subscription from "../models/Subscription.js";

export const getPlans = async(req,res)=>{
 
res.json([
{
plan:"BASIC",
price:99,
durationDays:30,
features:[
"10 jobs/day",
"Standard support"
]
},
{
plan:"PREMIUM",
price:299,
durationDays:30,
features:[
"Unlimited jobs",
"Priority visibility"
]
},
{
plan:"VIP",
price:599,
durationDays:30,
features:[
"Featured profile",
"VIP support"
]
}
]);
};

export const getSubscriptionStatus = async(req,res)=>{

const user = await User.findById(req.user.id);

res.json({
plan:user.subscriptionPlan,
status:user.subscriptionStatus,
start:user.subscriptionStartDate,
expiry:user.subscriptionExpiryDate
});
};
