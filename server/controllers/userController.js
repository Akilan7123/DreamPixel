import userModel from "../models/userModel.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import razorpay from 'razorpay';
import transactionModel from "../models/transactionModel.js";
import orders from "razorpay/dist/types/orders.ts";

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing details' });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
        });

        const user = await newUser.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.json({ success: true, token, user: { name: user.name } });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'User does not exist' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.json({ success: true, token, user: { name: user.name } });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const userCredits = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId)
        res.json({ success: true, credits: user.creditBalance, user: { name: user.name } })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const razorpayInstance = new razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET,
});

// const paymentRazorpay = async (req, res)=> {
//     try{
//         const {userId, planId} = req.body

//         const userData = await userModel.findById(userId)

//         if(!userId || !planId){
//             return res.json({success:false,message:'Missing Details'})
//         }

//         let credits, plan, amount, date 

//         switch(planId){
//             case 'Basic':
//                 plan = 'Basic'
//                 credits = 100
//                 amount = 10
//                 break;

//             case 'Advanced':
//                 plan = 'Advanced'
//                 credits = 500
//                 amount = 50
//                 break;

//             case 'Business':
//                 plan = 'Business'
//                 credits = 5000
//                 amount = 250
//                 break;

//             default:
//                 return res.json({success:false,message:'plan not found'});
//         }

//         date = Date.now();

//         const transactionData = {
//             userId, plan, amount, credits, date
//         }

//         const newTransaction = await transactionModel.create(transactionData)

//         const options = {
//             amount: amount * 100,
//             currency:process.env.CURRENCY,
//             receipt: newTransaction._id,
//         }

//         await razorpayInstance.orders.create(options,(error, order)=>{
//             if(error){
//                 console.log(error);
//                 return res.json({success:false,message:error})
//             }
//             res.json({success:true,order})
//         })

//     }catch(error){
//         console.log(error);
//         res.json({success:false,message:error.message})
//     }
// }

// const verifyRazorpay = async(req, res)=>{
//     try{
        
//         const {razorpay_order_id} = req.body;

//         const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id) 

//         if(orderInfo.status === 'paid'){
//             const transactionData = await transactionModel.findById(orderInfo.receipt)
//             if(transactionData.payment){
//                 return res.json({success:false,message:'Payment Failed'})
//             }

//             const userData = await userModel.findById(transactionData.userId)

//             const creditBalance = userData.creditBalance + transactionData.credits

//             await userModel.findByIdAndUpdate(userData._id,{creditBalance})

//             await transactionModel.findByIdAndUpdate(transactionData._id,{payment:true})

//             res.json({success:true,message:"Credits Added"})
//         }else{
//             res.json({success:false,message:"Payment Failed"})
//         }

//     }catch(error){
//         console.log(error);
//         res.json({success:false,message:error.message});
//     }
// }

const paymentRazorpay = async (req, res) => {
    try {
        const { userId, planId } = req.body;

        if (!userId || !planId) {
            return res.status(400).json({ success: false, message: 'Missing Details' });
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let credits, plan, amount;
        switch (planId) {
            case 'Basic':
                plan = 'Basic';
                credits = 100;
                amount = 10;
                break;
            case 'Advanced':
                plan = 'Advanced';
                credits = 500;
                amount = 50;
                break;
            case 'Business':
                plan = 'Business';
                credits = 5000;
                amount = 250;
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid plan' });
        }

        const transactionData = {
            userId,
            plan,
            amount,
            credits,
            date: Date.now()
        };

        const newTransaction = await transactionModel.create(transactionData);

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: process.env.CURRENCY || 'INR',
            receipt: newTransaction._id.toString(),
            payment_capture: 1 // Auto-capture payment
        };

        // Using promises instead of callback
        const order = await razorpayInstance.orders.create(options);
        res.json({ success: true, order });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ success: false, message: error.message || 'Payment processing failed' });
    }
};

const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed - missing fields' });
        }

        // Verify the payment signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed - invalid signature' });
        }

        // Fetch the order details
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

        if (orderInfo.status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Payment not completed' });
        }

        // Check if transaction already processed
        const transactionData = await transactionModel.findById(orderInfo.receipt);
        if (!transactionData) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        if (transactionData.payment) {
            return res.json({ success: true, message: 'Credits already added' });
        }

        // Update user credits
        const userData = await userModel.findById(transactionData.userId);
        const creditBalance = userData.creditBalance + transactionData.credits;

        // Use transaction to ensure both updates succeed or fail together
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            await userModel.findByIdAndUpdate(
                userData._id,
                { creditBalance },
                { session }
            );
            
            await transactionModel.findByIdAndUpdate(
                transactionData._id,
                { payment: true, razorpayPaymentId: razorpay_payment_id },
                { session }
            );
            
            await session.commitTransaction();
            res.json({ success: true, message: "Credits Added Successfully" });
            
        } catch (updateError) {
            await session.abortTransaction();
            throw updateError;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, message: error.message || 'Payment verification failed' });
    }
};

export { registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay };

