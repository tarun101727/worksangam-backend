import axios from "axios";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import {
  SUBSCRIPTION_PLANS,
} from "../utils/subscriptionPlans.js";

export const createSubscription =
async (req,res)=>{
try{

const userId=req.user.id;
const {planName}=req.body;

const plan=
SUBSCRIPTION_PLANS[planName];

if(!plan){
return res.status(400).json({
msg:"Invalid Plan"
});
}

const user=
await User.findById(userId);

const subscriptionId=
`sub_${Date.now()}`;

const response=
await axios.post(
"https://api.cashfree.com/pg/subscriptions",
{
subscription_id:
subscriptionId,

customer_details:{
customer_id:userId,
customer_email:user.email,
customer_phone:
"9999999999"
},

subscription_meta:{
return_url:
"https://worksangam.in/subscription-success"
},

plan_details:{
plan_name:planName,
plan_amount:plan.amount,
plan_currency:"INR",
plan_period:"MONTH"
}
},
{
headers:{
"x-client-id":
process.env.CASHFREE_APP_ID,

"x-client-secret":
process.env.CASHFREE_SECRET_KEY,

"x-api-version":
"2022-09-01"
}
}
);

await Subscription.create({
userId,
planName,
amount:plan.amount,
subscriptionId,
status:"PENDING"
});

res.json({
subscription_id:
subscriptionId,

payment_link:
response.data.auth_link
});

}catch(err){

console.log(err.response?.data);

res.status(500).json({
msg:"Subscription creation failed"
});
}
};

export const verifySubscription = async(req,res)=>{
try{

const {subscriptionId}=req.body;

const response=
await axios.get(
`https://api.cashfree.com/pg/subscriptions/${subscriptionId}`,
{
headers:{
"x-client-id":
process.env.CASHFREE_APP_ID,

"x-client-secret":
process.env.CASHFREE_SECRET_KEY,

"x-api-version":
"2022-09-01"
}
}
);

if(
response.data.subscription_status
=== "ACTIVE"
){

const subscription=
await Subscription.findOne({
subscriptionId
});

subscription.status="ACTIVE";

subscription.startDate=
new Date();

subscription.expiryDate=
new Date(
Date.now()+
30*24*60*60*1000
);

await subscription.save();

await User.findByIdAndUpdate(
subscription.userId,
{
subscriptionStatus:
"ACTIVE",

subscriptionPlan:
subscription.planName,

subscriptionId,

subscriptionStart:
subscription.startDate,

subscriptionEnd:
subscription.expiryDate
}
);
}

res.json(response.data);

}catch(err){

res.status(500).json({
msg:"Verification failed"
});
}
};

export const cashfreeSubscriptionWebhook =
async(req,res)=>{
try{

const data=req.body;

const subscriptionId=
data.data?.subscription
?.subscription_id;

const status=
data.data?.subscription
?.subscription_status;

if(!subscriptionId){
return res.sendStatus(200);
}

const subscription=
await Subscription.findOne({
subscriptionId
});

if(!subscription){
return res.sendStatus(200);
}

if(status==="ACTIVE"){

subscription.status="ACTIVE";

subscription.lastPaymentDate=
new Date();

subscription.nextBillingDate=
new Date(
Date.now()+
30*24*60*60*1000
);

await subscription.save();

await User.findByIdAndUpdate(
subscription.userId,
{
subscriptionStatus:
"ACTIVE",

subscriptionPlan:
subscription.planName,

subscriptionStart:
new Date(),

subscriptionEnd:
subscription.nextBillingDate
}
);
}

if(status==="FAILED"){

subscription.status="FAILED";

await subscription.save();

await User.findByIdAndUpdate(
subscription.userId,
{
subscriptionStatus:"FAILED"
}
);
}

if(status==="CANCELLED"){

subscription.status=
"CANCELLED";

await subscription.save();

await User.findByIdAndUpdate(
subscription.userId,
{
subscriptionStatus:
"CANCELLED"
}
);
}

res.sendStatus(200);

}catch(err){

console.log(err);

res.sendStatus(500);
}
};


export const getSubscriptionStatus =
async(req,res)=>{
try{

const subscription =
await Subscription.findOne({
userId:req.user.id
}).sort({createdAt:-1});

if(!subscription){
return res.json({
status:"NONE"
});
}

res.json(subscription);

}catch(err){

res.status(500).json({
msg:"Server Error"
});
}
};


export const cancelSubscription =
async(req,res)=>{
try{

const {subscriptionId} =
req.body;

await axios.post(
`https://api.cashfree.com/pg/subscriptions/${subscriptionId}/cancel`,
{},
{
headers:{
"x-client-id":
process.env.CASHFREE_APP_ID,

"x-client-secret":
process.env.CASHFREE_SECRET_KEY,

"x-api-version":
"2022-09-01"
}
}
);

const subscription =
await Subscription.findOne({
subscriptionId
});

subscription.status =
"CANCELLED";

await subscription.save();

await User.findByIdAndUpdate(
subscription.userId,
{
subscriptionStatus:
"CANCELLED"
}
);

res.json({
success:true
});

}catch(err){

console.log(err);

res.status(500).json({
msg:"Cancel Failed"
});
}
};
