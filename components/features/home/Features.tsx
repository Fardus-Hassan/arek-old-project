"use client";

import Title from "@/components/shared/Title";
import { motion } from "framer-motion";
import { Eraser, FileText, Folder, Ruler, Sparkles, User } from "lucide-react";

const features = [
  {
    id: 1,
    title: "AI Measurement Detection",
    description:
      "Accurate pixel-to-metric calculation for length, width, sleeves, and more.",
    icon: Ruler,
  },
  {
    id: 2,
    title: "Background and Object Removal",
    description: "Automatic cleanup of images without manual editing",
    icon: Eraser,
  },
  {
    id: 3,
    title: "Virtual Try-On Generation",
    description:
      "Realistic garment visualization on models or mannequins using generative AI.",
    icon: User,
  },
  {
    id: 4,
    title: "Measurement Diagram Creation",
    description: "Clear size overlays to reduce buyer confusion and returns.",
    icon: FileText,
  },
  {
    id: 5,
    title: "Google Drive Automation",
    description: "Structured storage and auto-trigger listing workflow.",
    icon: Folder,
  },
  {
    id: 6,
    title: "AI Product Descriptions",
    description:
      "SEO-optimized titles, descriptions, and tags generated automatically.",
    icon: Sparkles,
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) => {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative p-6 md:p-8 rounded-2xl bg-white shadow-sm flex flex-col items-start transition-all duration-300 hover:shadow-md hover:border hover:border-purple-200 border border-transparent">
      <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-4 md:mb-6">
        <Icon size={20} className="text-purple-600" />
      </div>
      <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2 md:mb-3 leading-tight">
        {feature.title}
      </h3>
      <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
};

export default function Features() {
  return (
    <section className="py-24 px-6 bg-[#f7f9fa]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Title
          title="Features"
          description="Everything you need to automate your apparel listings"
        />

        {/* Features Grid */}
        <div className="relative">
          {/* Desktop Connecting Lines */}
          <div className="hidden md:block absolute inset-0 z-0 pointer-events-none">
            {/* Row 1 Connectors */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{ transformOrigin: "left" }}
              className="absolute top-[20%] left-[27%] w-[9%] h-8 bg-[#C3A7FC]"
            />
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              style={{ transformOrigin: "left" }}
              className="absolute top-[20%] left-[63%] w-[9%] h-8 bg-[#C3A7FC]"
            />

            {/* Row 2 Connectors */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.8 }}
              style={{ transformOrigin: "left" }}
              className="absolute top-[75%] left-[28%] w-[9%] h-8 bg-[#C3A7FC]"
            />
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 1.0 }}
              style={{ transformOrigin: "left" }}
              className="absolute top-[75%] left-[63%] w-[9%] h-8 bg-[#C3A7FC]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-x-6 lg:gap-x-16 md:gap-y-12 relative z-10">
            {features.map((feature, index) => (
              <FeatureCard key={feature.id} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
