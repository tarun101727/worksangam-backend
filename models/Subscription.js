import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
{
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    planName:{
        type:String,
        enum:["BASIC","PREMIUM","VIP"],
        required:true
    },

    amount:Number,

    startDate:Date,

    expiryDate:Date,

    status:{
        type:String,
        enum:[
            "ACTIVE",
            "EXPIRED",
            "CANCELLED",
            "PENDING"
        ],
        default:"PENDING"
    },

    transactionId:String,

    paymentGateway:{
        type:String,
        default:"CASHFREE"
    }
},
{
    timestamps:true
}
);

export default mongoose.model(
    "Subscription",
    subscriptionSchema
);
