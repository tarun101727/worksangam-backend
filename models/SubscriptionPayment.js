import mongoose from "mongoose";

const subscriptionPaymentSchema = new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    orderId:{
        type:String,
        required:true,
        unique:true
    },

    amount:{
        type:Number,
        required:true
    },

    planName:{
        type:String,
        required:true
    },

    durationDays:{
        type:Number,
        required:true
    },

    status:{
        type:String,
        enum:["PENDING","SUCCESS","FAILED"],
        default:"PENDING"
    },

    paymentGateway:{
        type:String,
        default:"Cashfree"
    }

},{
    timestamps:true
});

export default mongoose.model(
    "SubscriptionPayment",
    subscriptionPaymentSchema
);
