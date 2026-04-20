import "./style.css";
export default function OverlayLayout({ children }: any) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        overflow: "hidden",
      }}>
      {children}
    </div>
  );
}
