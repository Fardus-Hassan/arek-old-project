"use client";

import { Label, Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Props for the DonutChart component
 */
export interface DonutChartProps {
  /** Current value to display */
  value: number;
  /** Maximum value for full circle */
  maxValue: number;
}

const chartConfig = {
  value: {
    label: "Value",
  },
} satisfies ChartConfig;

/**
 * Exact replica of the reference design
 * Only 2 props: value and maxValue
 */
export function DonutChart({ value, maxValue }: DonutChartProps) {
  return (
    <Card className="w-full bg-white">
      <CardHeader className="pb-0 pt-3 sm:pt-6">
        <Select defaultValue="week">
          <SelectTrigger className="w-[110px] sm:w-[130px] h-[36px] sm:h-[40px] bg-[#EBF0F5] hover:bg-[#E5EAF0] border-0 rounded-none text-[12px] sm:text-[14px] font-medium text-[#1A1A1A] focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Weekly" />
          </SelectTrigger>
          <SelectContent className="border-0 shadow-lg rounded-[12px]">
            <SelectItem value="week" className="text-[12px] sm:text-[14px]">
              Weekly
            </SelectItem>
            <SelectItem value="month" className="text-[12px] sm:text-[14px]">
              Monthly
            </SelectItem>
            <SelectItem value="year" className="text-[12px] sm:text-[14px]">
              Yearly
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-4 sm:px-8 pt-4 sm:pt-6 pb-6 sm:pb-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Text */}
          <div className="flex-shrink-0 order-2 sm:order-1">
            <h2 className="text-xl sm:text-2xl text-center font-semibold text-[#1A1A1A]">
              Average
              <br />
              Time Saved
            </h2>
          </div>

          {/* Right: Chart */}
          <div className="relative flex-shrink-0 order-1 sm:order-2">
            <ChartContainer
              config={chartConfig}
              className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
              <PieChart width={220} height={220}>
                {/* Background circle - light purple/gray */}
                <Pie
                  data={[{ value: maxValue }]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={450}
                  innerRadius={40}
                  outerRadius={90}
                  paddingAngle={0}
                  cornerRadius={0}
                  stroke="none"
                  className="sm:!inner-radius-[50] sm:!outer-radius-[110]">
                  <Cell fill="#F5F9FF" />
                </Pie>

                {/* Foreground arc - purple gradient */}
                <Pie
                  data={[{ value: value }]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={90 + (value / maxValue) * 360}
                  innerRadius={40}
                  outerRadius={90}
                  paddingAngle={0}
                  cornerRadius={0}
                  stroke="none"
                  className="sm:!inner-radius-[50] sm:!outer-radius-[110]">
                  <Cell fill="#C9A5DC" />

                  {/* Center white circle with value */}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <g>
                            {/* SVG Filter for shadow */}
                            <defs>
                              <filter
                                id="centerShadow"
                                x="-50%"
                                y="-50%"
                                width="200%"
                                height="200%">
                                <feDropShadow
                                  dx="0"
                                  dy="8"
                                  stdDeviation="20"
                                  floodColor="#000000"
                                  floodOpacity="0.08"
                                />
                              </filter>
                            </defs>

                            {/* White center circle with shadow - responsive size */}
                            <circle
                              cx={viewBox.cx}
                              cy={viewBox.cy}
                              r={50}
                              fill="white"
                              filter="url(#centerShadow)"
                              className="sm:!r-[60]"
                            />

                            {/* Value text - responsive size */}
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle">
                              <tspan
                                className="fill-[#1A1A1A] text-[24px] sm:text-[28px] font-semibold tracking-[-0.01em]"
                                style={{
                                  fontFamily:
                                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                }}>
                                {value}
                              </tspan>
                            </text>
                          </g>
                        );
                      }
                      return null;
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DonutChart;
