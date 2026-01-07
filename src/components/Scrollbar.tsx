// components/Scrollbar.tsx
import { useEffect, useState, useRef } from "react";

const Scrollbar = () => {
  const [scrollHeight, setScrollHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  // Calculate scroll metrics
  const updateScrollMetrics = () => {
    const { scrollHeight, clientHeight } = document.documentElement;
    const viewportHeight = window.innerHeight;

    // Check if content is scrollable
    setIsScrollable(scrollHeight > viewportHeight);

    if (scrollHeight > viewportHeight) {
      setScrollHeight((viewportHeight / scrollHeight) * viewportHeight);
      setScrollTop((window.scrollY / scrollHeight) * viewportHeight);
    } else {
      setScrollHeight(0);
      setScrollTop(0);
    }
  };

  // Update on resize + initial load
  useEffect(() => {
    updateScrollMetrics();
    window.addEventListener("resize", updateScrollMetrics);
    window.addEventListener("scroll", updateScrollMetrics);

    return () => {
      window.removeEventListener("resize", updateScrollMetrics);
      window.removeEventListener("scroll", updateScrollMetrics);
    };
  }, []);

  // Drag handlers
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
    const scrollRatio = newTop / window.innerHeight;
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

  // Hide scrollbar completely if not scrollable
  if (!isScrollable) return null;

  return (
    <div
      ref={trackRef}
      className="custom-scrollbar-track"
      style={{
        position: "fixed",
        right: "0px",
        top: "0",
        height: "100%",
        width: "4px",
        background: "rgba(0,0,0,0.1)",
        borderRadius: "4px",
        zIndex: 9999,
      }}
    >
      <div
        ref={thumbRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: `${scrollTop}px`,
          right: "0",
          width: "100%",
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
