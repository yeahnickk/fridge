import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';

const SuccessAnimation = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  >
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4"
    >
      <div className="w-20 h-20 mx-auto mb-6 relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center"
        >
          <FiCheck className="text-4xl text-white" />
        </motion.div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Recipe Saved!</h3>
      <p className="text-gray-600 mb-6">
        You can find this recipe in your saved collection
      </p>
      <button
        onClick={() => setCurrentView('saved')}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600
                 text-white rounded-xl font-medium hover:opacity-90
                 transition-opacity"
      >
        View Saved Recipes
      </button>
    </motion.div>
  </motion.div>
);

export default SuccessAnimation; 