import mongoose from "mongoose";

const subscriptionSchema =
new mongoose.Schema(
{
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },

  planName:{
    type:String,
    enum:["BASIC","PREMIUM","VIP"]
  },

  amount:Number,

  subscriptionId:String,

  cashfreePlanId:String,

  customerId:String,

  status:{
    type:String,
    enum:[
      "PENDING",
      "ACTIVE",
      "FAILED",
      "CANCELLED",
      "EXPIRED"
    ],
    default:"PENDING"
  },

  paymentMethod: String,

cashfreeReferenceId: String,

mandateStatus: {
  type: String,
  default: "PENDING"
},

eventLogs: [
{
  eventType: String,
  eventData: Object,
  createdAt: {
    type: Date,
    default: Date.now
  }
}
],

  startDate:Date,

  expiryDate:Date,

  lastPaymentDate:Date,

  nextBillingDate:Date
},
{
  timestamps:true
}
);

export default mongoose.model(
  "Subscription",
  subscriptionSchema
);
