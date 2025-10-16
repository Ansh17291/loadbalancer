import React, { useEffect, useState } from "react";

const DebugPanel = ({ url = "http://localhost:8080/metrics" }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchOnce() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (e) {
        if (mounted) setError(String(e));
      }
    }
    fetchOnce();
    const id = setInterval(fetchOnce, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [url]);

  return (
    <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 9999 }}>
      <div
        style={{
          width: 360,
          maxHeight: "50vh",
          overflow: "auto",
          background: "#0b1220",
          color: "#d1d5db",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #374151",
          fontSize: 12,
        }}
      >
        {/* <div style={{ marginBottom: 8, fontWeight: 600 }}>Debug: /metrics</div> */}
        {/* {error ? (
          <div style={{ color: "#f87171" }}>Error: {error}</div>
        ) : data ? (
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div>Loading...</div>
        )} */}
      </div>
    </div>
  );
};

export default DebugPanel;
