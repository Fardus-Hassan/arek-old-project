"use client";

import Title from "@/components/shared/Title";
import { motion } from "framer-motion";
import { Brain, CheckCircle, Scan, Upload } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Upload",
    description:
      "Upload a flat lay clothing photo with a measurement reference.",
    icon: Upload,
    label: "Step-1",
    bgColor: "bg-slate-50",
    labelColor: "bg-[#5F7182]",
    iconColor: "bg-slate-100 text-slate-500",
    lineColor: "stroke-slate-300",
  },
  {
    id: 2,
    title: "AI Processing",
    description:
      "AI detects garment, calculates real-world measurements, removes background, and generates on-model images.",
    icon: Brain,
    label: "Step-2",
    bgColor: "bg-[#F9F1FB]",
    labelColor: "bg-[#D6B5E8]",
    iconColor: "bg-[#F3E6F8] text-[#A825C7]",
    lineColor: "stroke-purple-300",
  },
  {
    id: 3,
    title: "Verification",
    description:
      "Please review the information below before publishing. You can still make changes if needed.",
    icon: Scan,
    label: "Step-3",
    bgColor: "bg-[#F9F1FB]",
    labelColor: "bg-[#C1A8F8]",
    iconColor: "bg-[#F3E6F8] text-[#A825C7]",
    lineColor: "stroke-purple-300",
  },
  {
    id: 4,
    title: "Auto-List",
    description:
      "Automatic product listing with title, description, tags, images, and inventory update.",
    icon: CheckCircle,
    label: "Step-4",
    bgColor: "bg-slate-50",
    labelColor: "bg-[#5F7182]",
    iconColor: "bg-slate-100 text-slate-500",
    lineColor: "stroke-slate-300",
  },
];

const StepCard = ({
  step,
  isRight,
  isLast,
  index,
}: {
  step: (typeof steps)[0];
  isRight: boolean;
  isLast: boolean;
  index: number;
}) => {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 50 : -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
      className={`relative flex flex-col md:flex-row items-center w-full ${isRight ? "md:justify-end" : "md:justify-start"}`}
    >
      <div
        className={`relative flex items-stretch rounded-2xl overflow-hidden shadow-sm w-full max-w-[400px] ${step.bgColor}`}
      >
        {/* Vertical Step Label Pill */}
        <div className="flex items-center p-3 pl-5">
          <div
            className={`flex items-center justify-center px-4 py-6 rounded-lg ${step.labelColor} min-h-[140px] h-full`}
          >
            <span className="[writing-mode:vertical-lr] rotate-180 text-white font-semibold text-xs tracking-[0.2em] uppercase">
              {step.label}
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="flex flex-col p-5 md:p-6 flex-1">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 md:mb-4 ${step.iconColor}`}
          >
            <Icon size={20} />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1.5 md:mb-2">
            {step.title}
          </h3>
          <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      {/* Mobile Dashed Line Connector with Arrow */}
      {!isLast && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          whileInView={{ height: 48, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-8 md:hidden overflow-hidden"
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 bottom-1 
         border-dashed border-l-2  border-slate-300"
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent  border-r-[3px] border-r-transparent border-t-[5px] border-t-slate-300" />
        </motion.div>
      )}
    </motion.div>
  );
};

const ConnectingLines = () => {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      <svg className="w-full h-full overflow-visible" fill="none">
        <defs>
          <marker
            id="arrowhead-slate"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="#cbd5e1" />
          </marker>
          <marker
            id="arrowhead-purple"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="#E6C9F2" />
          </marker>
        </defs>
        {/* Line 1 to 2 */}
        <motion.path
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
          d="M 400 150 L 715 150 L 715 240"
          className="stroke-slate-300"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          markerEnd="url(#arrowhead-slate)"
        />
        {/* Line 2 to 3 */}
        <motion.path
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, delay: 1.0, ease: "easeOut" }}
          d="M 600 390 L 285 390 L 285 510"
          className="stroke-[#E6C9F2]"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          markerEnd="url(#arrowhead-purple)"
        />
        {/* Line 3 to 4 */}
        <motion.path
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
          d="M 400 630 L 710 630 L 710 780"
          className="stroke-slate-300"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          markerEnd="url(#arrowhead-slate)"
        />
      </svg>
    </div>
  );
};

export default function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-white overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Title
          title="How It Works"
          description="Three steps to transform inventory into listings"
        />

        {/* Steps Container */}
        <div className="relative">
          {/* Desktop Connecting Lines */}
          <ConnectingLines />

          {/* Cards Grid */}
          <div className="flex flex-col gap-12 md:gap-16">
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                isRight={index % 2 !== 0}
                isLast={index === steps.length - 1}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
