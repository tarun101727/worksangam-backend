import axios from "axios";

import Subscription from "../models/Subscription.js";
import User from "../models/User.js";

import {
  SUBSCRIPTION_PLANS,
} from "../utils/subscriptionPlans.js";

export const getPlans = async (req,res)=>{

  res.json({
    plans:[
      {
        plan:"BASIC",
        amount:99,
        benefits:[
          "Basic visibility",
          "Apply jobs faster"
        ]
      },

      {
        plan:"PREMIUM",
        amount:299,
        benefits:[
          "Priority visibility",
          "Featured profile"
        ]
      },

      {
        plan:"VIP",
        amount:599,
        benefits:[
          "Top placement",
          "Maximum reach"
        ]
      }
    ]
  });
};

export const createSubscription =
async (req,res)=>{

try{

const userId=req.user.id;

const {planName}=req.body;

const plan=
SUBSCRIPTION_PLANS[planName];

if(!plan){

return res.status(400).json({
msg:"Invalid plan"
});
}

const user=
await User.findById(userId);

if(!user){

return res.status(404).json({
msg:"User not found"
});
}

const orderId=
`sub_${Date.now()}`;

await Subscription.create({

userId,

planName,

amount:plan.amount,

orderId,

status:"PENDING"
});

const response=
await axios.post(
"https://api.cashfree.com/pg/orders",
{
order_id:orderId,

order_amount:plan.amount,

order_currency:"INR",

customer_details:{
customer_id:userId,
customer_email:user.email,
customer_phone:
user.phone || "9999999999"
},

order_meta:{
return_url:
"https://worksangam.in/payment-success?order_id={order_id}"
}
},
{
headers:{
"x-client-id":
process.env.CASHFREE_APP_ID,

"x-client-secret":
process.env.CASHFREE_SECRET_KEY,

"x-api-version":
"2023-08-01"
}
}
);

res.json({

success:true,

payment_session_id:
response.data.payment_session_id,

order_id:
response.data.order_id
});

}catch(err){

console.log(err.response?.data);

res.status(500).json({
msg:"Payment creation failed"
});
}
};

export const subscriptionWebhook =
async(req,res)=>{

try{

const orderId=
req.body?.data?.order?.order_id;

const paymentStatus=
req.body?.data?.payment?.payment_status;

if(!orderId){

return res.sendStatus(400);
}

const subscription=
await Subscription.findOne({
orderId
});

if(!subscription){

return res.sendStatus(404);
}

if(
subscription.status==="ACTIVE"
){

return res.sendStatus(200);
}

if(paymentStatus==="SUCCESS"){

const plan=
SUBSCRIPTION_PLANS[
subscription.planName
];

const startDate=
new Date();

const expiryDate=
new Date();

expiryDate.setDate(
expiryDate.getDate()
+
plan.days
);

subscription.status="ACTIVE";

subscription.startDate=
startDate;

subscription.expiryDate=
expiryDate;

await subscription.save();

await User.findByIdAndUpdate(
subscription.userId,
{
subscriptionPlan:
subscription.planName,

subscriptionExpiry:
expiryDate
}
);

}else{

subscription.status="FAILED";

await subscription.save();
}

res.sendStatus(200);

}catch(err){

console.log(err);

res.sendStatus(500);
}
};

export const mySubscription =
async(req,res)=>{

const subscription=
await Subscription.findOne({
userId:req.user.id,
status:"ACTIVE"
})
.sort({
createdAt:-1
});

res.json(subscription);
};



export const verifySubscriptionPayment = async (req,res)=>{

try{

const {orderId} = req.params;

const response = await axios.get(
`https://api.cashfree.com/pg/orders/${orderId}`,
{
headers:{
"x-client-id":process.env.CASHFREE_APP_ID,
"x-client-secret":process.env.CASHFREE_SECRET_KEY,
"x-api-version":"2023-08-01"
}
}
);

res.json(response.data);

}catch(err){

res.status(500).json({
msg:"Verification failed"
});
}
};
