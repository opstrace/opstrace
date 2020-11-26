import React, { useEffect } from "react";

function Runtime() {
  useEffect(() => {
    const script = document.createElement("script");

    script.src = `/modules/@opstrace/stdlib/prometheus/usePrometheusRangeQuery.js`;
    script.type = "module";

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);
  return <div>here</div>;
}

export default Runtime;
