import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    orderId:String,

    transactionId:String,

    amount:Number,

    currency:{
        type:String,
        default:"INR"
    },

    paymentMethod:String,

    paymentStatus:{
        type:String,
        default:"PENDING"
    },

    gatewayResponse:Object

},{
    timestamps:true
});

export default mongoose.model(
    "Payment",
    paymentSchema
);
