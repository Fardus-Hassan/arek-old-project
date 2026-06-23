// "use client";
// import React from "react";

// interface PetalLoaderProps {
//   size?: number;
// }

// const PetalLoader: React.FC<PetalLoaderProps> = ({ size = 200 }) => {
//   const petalCount = 8;
//   const petals = Array.from({ length: petalCount }, (_, i) => i);

//   // Primary color: #a825c7
//   // Highlight: #E879F9
//   // Shadow: #701A85

//   const cycleTime = 2;

//   return (
//     <div className="flex items-center justify-center">
//       <div
//         className="relative animate-elastic-spin"
//         style={{ width: size, height: size }}>
//         {petals.map((index) => {
//           const rotation = (360 / petalCount) * index;
//           const animationDelay = -(index * cycleTime) / petalCount;

//           return (
//             <div
//               key={index}
//               className="absolute top-1/2 left-1/2"
//               style={{
//                 transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
//               }}>
//               <div
//                 className="petal-anim-container"
//                 style={{
//                   // Set default transform to match 0% keyframe to prevent initial cluster flicker
//                   transform: `translateY(-${size * 0.38}px) scale(0.95)`,
//                   opacity: 0.4,
//                   animation: `petalLiquid ${cycleTime}s ease-in-out ${animationDelay}s infinite`,
//                 }}>
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   width={size * 0.25}
//                   height={size * 0.25}
//                   viewBox="0 0 82 83"
//                   fill="none"
//                   className="petal-svg-tilt">
//                   <path
//                     d="M0 82.139L16.597 42.779C27.529 16.854 52.926 0 81.062 0L64.4651 39.36C53.5341 65.285 28.136 82.139 0 82.139Z"
//                     fill={`url(#liquid-gradient-${index})`}
//                   />
//                   <defs>
//                     <linearGradient
//                       id={`liquid-gradient-${index}`}
//                       x1="0%"
//                       y1="0%"
//                       x2="100%"
//                       y2="100%">
//                       <stop offset="0%" stopColor="#a825c7" />
//                       <stop offset="50%" stopColor="#E879F9">
//                         <animate
//                           attributeName="offset"
//                           values="0.2; 0.8; 0.2"
//                           dur="2s"
//                           repeatCount="indefinite"
//                         />
//                       </stop>
//                       <stop offset="100%" stopColor="#701A85" />
//                     </linearGradient>
//                   </defs>
//                 </svg>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       <style jsx>{`
//         @keyframes petalLiquid {
//           0%,
//           100% {
//             opacity: 0.4;
//             transform: translateY(-${size * 0.4}px) scale(0.97) rotate(0deg);
//           }
//           50% {
//             opacity: 1;
//             transform: translateY(-${size * 0.41}px) scale(1.01) rotate(10deg);
//           }
//         }

//         @keyframes elasticSpin {
//           0% {
//             transform: rotate(0deg);
//           }
//           100% {
//             transform: rotate(360deg);
//           }
//         }

//         .animate-elastic-spin {
//           animation: elasticSpin 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
//         }

//         .petal-anim-container {
//           will-change: transform, opacity;
//         }

//         .petal-svg-tilt {
//           filter: drop-shadow(0 0 10px rgba(168, 37, 199, 0.35));
//         }
//       `}</style>
//     </div>
//   );
// };

// export default PetalLoader;

"use client";
import React from "react";

interface PetalLoaderProps {
  size?: number;
}

const PetalLoader: React.FC<PetalLoaderProps> = ({ size = 200 }) => {
  const petalCount = 8;
  const petals = Array.from({ length: petalCount }, (_, i) => i);

  // Primary color: #a825c7
  // Highlight: #E879F9
  // Shadow: #701A85

  const cycleTime = 2;

  return (
    <div className="flex items-center justify-center relative">
      <div
        className="relative animate-elastic-spin"
        style={{ width: size, height: size }}>
        {petals.map((index) => {
          const rotation = (360 / petalCount) * index;
          const animationDelay = -(index * cycleTime) / petalCount;

          return (
            <div
              key={index}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}>
              <div
                className="petal-anim-container"
                style={{
                  // Set default transform to match 0% keyframe to prevent initial cluster flicker
                  transform: `translateY(-${size * 0.38}px) scale(0.95)`,
                  opacity: 0.4,
                  animation: `petalLiquid ${cycleTime}s ease-in-out ${animationDelay}s infinite`,
                }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={size * 0.25}
                  height={size * 0.25}
                  viewBox="0 0 82 83"
                  fill="none"
                  className="petal-svg-tilt">
                  <path
                    d="M0 82.139L16.597 42.779C27.529 16.854 52.926 0 81.062 0L64.4651 39.36C53.5341 65.285 28.136 82.139 0 82.139Z"
                    fill={`url(#liquid-gradient-${index})`}
                  />
                  <defs>
                    <linearGradient
                      id={`liquid-gradient-${index}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%">
                      <stop offset="0%" stopColor="#a825c7" />
                      <stop offset="50%" stopColor="#E879F9">
                        <animate
                          attributeName="offset"
                          values="0.2; 0.8; 0.2"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </stop>
                      <stop offset="100%" stopColor="#701A85" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading Text - Center (Outside spinning container) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <p
          className="text-center font-medium loading-text"
          style={{
            color: "#000000",
            fontSize: size * 0.05,
            letterSpacing: "0.05em",
          }}>
          Loading...
        </p>
      </div>

      <style jsx>{`
        @keyframes petalLiquid {
          0%,
          100% {
            opacity: 0.4;
            transform: translateY(-${size * 0.4}px) scale(0.97) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-${size * 0.41}px) scale(1.01) rotate(10deg);
          }
        }

        @keyframes elasticSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes loadingPulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-elastic-spin {
          animation: elasticSpin 6s linear infinite;
        }

        .petal-anim-container {
          will-change: transform, opacity;
        }

        .petal-svg-tilt {
          filter: drop-shadow(0 0 10px rgba(168, 37, 199, 0.35));
        }

        .loading-text {
          animation: loadingPulse 1.5s ease-in-out infinite;
          text-shadow: 0 0 10px rgba(168, 37, 199, 0.3);
        }
      `}</style>
    </div>
  );
};

export default PetalLoader;
