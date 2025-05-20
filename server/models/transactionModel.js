import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    plan: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    credits: {
        type: Number,
        required: true,
    },
    payment: {
        type: Boolean,
        default: false,
    },
    date: {
        type: Date,
        default: Date.now, // Stores as proper Date object
        get: (date) => date.toISOString() // Optional: Format when retrieved
    }
}, {
    timestamps: true, // Adds createdAt/updatedAt
    toJSON: { getters: true } // Applies getters when converting to JSON
})


const transactionModel = mongoose.models.transaction || mongoose.model("transaction", transactionSchema);

export default transactionModel;