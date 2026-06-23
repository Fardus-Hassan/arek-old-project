import Features from "../features/home/Features";
import HeroSection from "../features/home/HeroSection";
import HowItWorks from "../features/home/HowItWorks";

export default function HomePage() {
  return (
    <div>
      {/* here will be hero section  */}
      <HeroSection/>
      {/* how it works section  */}
      <HowItWorks />
      {/* features section  */}
      <Features />
      

    </div>
  )
}
