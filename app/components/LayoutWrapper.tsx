"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNavigation from "./BottomNavigation";

export default function LayoutWrapper({ children }: any) {
  const pathname = usePathname();

  const isHomepage = pathname === "/";

  const isOverlay =
    pathname.includes("/overlay") || pathname.includes("/camera");

  return (
    <>
      {!isOverlay && <Navbar />}
      {/* <BottomNavigation /> */}
      {children}
      {isHomepage && <Footer />}
    </>
  );
}
