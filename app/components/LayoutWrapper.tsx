"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNavigation from "./BottomNavigation";
import { useScrollDirection } from "../hooks/useScrollDirection";

export default function LayoutWrapper({ children }: any) {
  const pathname = usePathname();

  const isHomepage = pathname === "/";

  const isOverlay =
    pathname.includes("/overlay") || pathname.includes("/camera");

  const isVisible = useScrollDirection();

  return (
    <>
      {!isOverlay && <Navbar isVisible={isVisible} />}
      {children}
      {isHomepage && <Footer />}
    </>
  );
}
