import React from 'react';
import { motion } from 'framer-motion';

const RecipeCard: React.FC = () => {
  const recipe = { title: 'Recipe Title' }; // Replace with actual recipe data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h3 className="text-xl font-semibold">{recipe.title}</h3>
        {/* ... rest of card content */}
      </motion.div>
    </motion.div>
  );
};

export default RecipeCard; 