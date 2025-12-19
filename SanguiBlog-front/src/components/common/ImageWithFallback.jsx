import React, { useState, useMemo, useEffect } from "react";

const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160' fill='none'><rect width='160' height='160' rx='24' fill='%23f5f5f5'/><path d='M53 65a27 27 0 1 1 54 0 27 27 0 0 1-54 0Z' stroke='%23d1d5db' stroke-width='6' stroke-linecap='round'/><path d='M34 126c8-18 24-30 46-30s38 12 46 30' stroke='%23d1d5db' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/><circle cx='103' cy='57' r='6' fill='%23d1d5db'/></svg>";

/**
 * 通用图片组件：懒加载 + 失败回退 + 可配置占位
 */
export default function ImageWithFallback({ src, alt = '', fallback = PLACEHOLDER, className = '', loading = 'lazy', ...rest }) {
  const [error, setError] = useState(false);
  useEffect(() => {
    setError(false);
  }, [src]);
  const safeSrc = useMemo(() => (!src || error ? fallback : src), [src, error, fallback]);

  return (
    <img
      src={safeSrc}
      alt={alt}
      loading={loading}
      onError={() => setError(true)}
      className={className}
      {...rest}
    />
  );
}

