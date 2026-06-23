import Image from "next/image";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative h-screen inter bg-[#F8F9FB] flex items-center justify-center px-4 py-0 md:px-8 lg:p-12 xl:p-24 overflow-hidden">
      {/* MOBILE BACKGROUND - Only visible on small/medium screens */}
      <div className="absolute inset-0 lg:hidden z-0">
        <Image
          src="/images/authImage.png"
          alt="Auth Background"
          fill
          priority
          className="object-cover opacity-20 sm:opacity-30"
        />
        <div className="absolute inset-0 bg-[#F8F9FB]/5 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full lg:max-w-[1600px] xl:max-w-screen h-full flex flex-col lg:flex-row items-center gap-8 lg:gap-20">
        {/* LEFT IMAGE - Visible only on desktop */}
        <div className="hidden lg:block lg:w-5/9 h-full">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-[87vh] relative rounded-2xl overflow-hidden shadow-sm">
              <Image
                src="/images/authImage.png"
                alt="Auth"
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* FORM SECTION - Centered on mobile, side-car on desktop */}
        <div className="w-full lg:w-4/9 flex lg:items-center justify-center h-full md:h-screen overflow-y-auto scrollbar-thin pt-10 pb-10 lg:py-0 px-2 lg:p-2">
          <div className="w-full max-w-md sm:max-w-xl lg:max-w-4xl">
            {children}
            {/* FORCE BOTTOM SPACING ON MOBILE */}
            <div className="h-24 lg:hidden" />
          </div>
        </div>
      </div>
    </div>
  );
}
