import { useState, useEffect } from "react";

export function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide the header if scrolling down and past the 50px mark
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } 
      // Show the header if scrolling up, or at the very top of the page
      else if (currentScrollY < lastScrollY || currentScrollY <= 50) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    // Use passive listener for better scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  return isVisible;
}