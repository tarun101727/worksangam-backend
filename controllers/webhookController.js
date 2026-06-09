import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";

export const paymentWebhook =
async(req,res)=>{

const data = req.body;

const orderId =
data.data.order.order_id;

const payment =
await Payment.findOne({
orderId
});

if(!payment){
return res.sendStatus(200);
}

if(
payment.paymentStatus ===
"SUCCESS"
){
return res.sendStatus(200);
}

payment.paymentStatus =
"SUCCESS";

payment.transactionId =
data.data.payment.cf_payment_id;

await payment.save();

const user =
await User.findById(
payment.userId
);

const start =
new Date();

const expiry =
new Date(
start.getTime()
+
30*24*60*60*1000
);

user.subscriptionPlan =
payment.planName;

user.subscriptionStatus =
"ACTIVE";

user.subscriptionStartDate =
start;

user.subscriptionExpiryDate =
expiry;

await user.save();

await Subscription.create({
userId:user._id,
planName:payment.planName,
amount:payment.amount,
startDate:start,
expiryDate:expiry,
status:"ACTIVE",
transactionId:
payment.transactionId
});

res.sendStatus(200);
};
