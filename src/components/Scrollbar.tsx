//components/Scrollbar.tsx
import { useEffect, useState, useRef } from "react";

const Scrollbar = () => {
  const [scrollHeight, setScrollHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  // Update scroll height
  useEffect(() => {
    const handleResize = () => {
      setScrollHeight(
        (window.innerHeight / document.documentElement.scrollHeight) *
          window.innerHeight
      );
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync with window scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(
        (window.scrollY / document.documentElement.scrollHeight) *
          window.innerHeight
      );
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startScrollTop.current = scrollTop;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const deltaY = e.clientY - startY.current;
    const newTop = startScrollTop.current + deltaY;
    const scrollRatio =
      newTop / window.innerHeight; // position ratio
    window.scrollTo({
      top: scrollRatio * document.documentElement.scrollHeight,
      behavior: "auto",
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={trackRef}
      style={{
        position: "fixed",
        right: "8px",
        top: "0",
        height: "100%",
        width: "8px",
        background: "rgba(0,0,0,0.1)",
        borderRadius: "4px",
      }}
    >
      <div
        ref={thumbRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: `${scrollTop}px`,
          right: "0",
          width: "50%",
          height: `${scrollHeight}px`,
          background: "linear-gradient(135deg,#FF8A00,#FF5F6D,#A557FF)",
          borderRadius: "4px",
          cursor: "grab",
        }}
      />
    </div>
  );
};

export default Scrollbar;
