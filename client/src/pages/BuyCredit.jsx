import React, { useContext, useEffect } from 'react'
import { assets, plans } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import { motion } from 'framer-motion'; // Fixed import (motion/react → framer-motion)
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const BuyCredit = () => {
  const { user, backendUrl, loadCreditsData, token, setShowLogin } = useContext(AppContext);
  const navigate = useNavigate();

  // Load Razorpay script dynamically
  useEffect(() => {
    const loadRazorpay = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpay();
  }, []);

  const initPay = async (order) => {
    try {
      if (!window.Razorpay) {
        toast.error('Payment system is loading, please try again in a moment');
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Credits Payment',
        description: 'Credits Payment',
        order_id: order.id,
        receipt: order.receipt,
        handler: async (response) => {
          try {
            const { data } = await axios.post(
              `${backendUrl}/api/user/verify-razor`,
              response,
              { headers: { token } }
            );
            if (data.success) {
              await loadCreditsData();
              navigate('/');
              toast.success('Credits Added Successfully!');
            } else {
              toast.error('Payment verification failed');
            }
          } catch (error) {
            toast.error(error.response?.data?.message || error.message);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#000000', // Black theme
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error('Failed to initialize payment');
      console.error('Payment initialization error:', error);
    }
  };

  const paymentRazorpay = async (planId) => {
    try {
      if (!user) {
        setShowLogin(true);
        return;
      }

      if (!token) {
        toast.error('Please login first');
        return;
      }

      const { data } = await axios.post(
        `${backendUrl}/api/user/pay-razor`,
        { planId },
        { headers: { token } }
      );

      if (data.success) {
        await initPay(data.order);
      } else {
        toast.error(data.message || 'Failed to create payment order');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      console.error('Payment error:', error);
    }
  };

  return (
    <motion.div 
      className='min-h-[80vh] text-center pt-14 mb-10'
      initial={{ opacity: 0.2, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <button className='border border-gray-400 px-10 py-2 rounded-full mb-6'>
        Our Plans
      </button>
      <h1 className='text-center text-3xl font-medium mb-6 sm:mb-10'>
        Choose the plans
      </h1>

      <div className='flex flex-wrap justify-center gap-6 text-left'>
        {plans.map((plan, index) => (
          <div 
            key={index} 
            className='bg-white drop-shadow-sm rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500'
          >
            <img src={assets.logo_icon} alt="" width={40} />
            <p className='mt-3 mb-1 font-semibold'>{plan.id}</p>
            <p className='text-sm'>{plan.desc}</p>
            <p className='mt-6'>
              <span className='text-3xl font-medium'>${plan.price} </span>
              / {plan.credits} credits
            </p>
            <button 
              onClick={() => paymentRazorpay(plan.id)}
              className='w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52 hover:bg-gray-700 transition-colors'
            >
              {user ? 'Purchase Now' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BuyCredit;
