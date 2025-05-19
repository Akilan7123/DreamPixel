import mongoose from "mongoose";

const connectDB = async()=> {
    //event
    mongoose.connection.on('connected',()=>{
        console.log("Database Connected");
    })
    await mongoose.connect(`${process.env.MONGODB_URI}/imagify`);
}

export default connectDB;