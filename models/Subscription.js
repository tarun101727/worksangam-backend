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

    amount:{
        type:Number,
        required:true
    },

    orderId:String,

    paymentId:String,

    status:{
        type:String,
        enum:[
            "PENDING",
            "ACTIVE",
            "EXPIRED",
            "FAILED"
        ],
        default:"PENDING"
    },

    startDate:Date,

    expiryDate:Date
},
{
    timestamps:true
}
);

export default mongoose.model(
    "Subscription",
    subscriptionSchema
);
