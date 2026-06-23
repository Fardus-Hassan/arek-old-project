import Footer from "@/components/shared/Footer";
import Navbar from "@/components/shared/Navbar";
import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
  return <>
    <Navbar/>
    <main className="min-h-[calc(100vh-265px)]">
        {children}
    </main>
    <Footer/>
    </>;
}
