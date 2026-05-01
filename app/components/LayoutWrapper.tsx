"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function LayoutWrapper({ children }: any) {
  const pathname = usePathname();

  const isOverlay = pathname.includes("/overlay") || pathname.includes("/obs");

  return (
    <>
      {!isOverlay && <Navbar />}
      {children}
    </>
  );
}
