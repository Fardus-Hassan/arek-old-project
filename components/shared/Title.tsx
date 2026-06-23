"use client";

import React from "react";
import { motion } from "framer-motion";

function Title({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="text-center mb-12 md:mb-24 px-4"
    >
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="text-2xl md:text-4xl font-bold text-black mb-3 md:mb-4 inter"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="text-xs sm:text-sm md:text-base text-slate-500 font-medium max-w-2xl mx-auto"
      >
        {description}
      </motion.p>
    </motion.div>
  );
}

export default Title;
