"use client";

import React from "react";

interface AmountProps {
  /** The numeric value to format and display */
  value: number;
  /** Whether to use compact formatting (K, M) for values >= 1000 */
  compact?: boolean;
  /** Custom class for the wrapper (controls the main text size and color) */
  className?: string;
  /** Custom class for the currency label (defaults to smaller, less prominent) */
  currencyClassName?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

export default function Amount({
  value,
  compact = false,
  className = "",
  currencyClassName = "text-[0.65em] opacity-70 font-semibold tracking-wider",
  style,
}: AmountProps) {
  let formattedNumber = "";

  // Always use standard format with commas for thousands
  formattedNumber = new Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <div className={`inline-flex items-baseline gap-1 select-none ${className}`} style={style} dir="ltr">
      <span className="font-black tracking-tight leading-none">
        {formattedNumber}
      </span>
      <span className={currencyClassName}>
        EGP
      </span>
    </div>
  );
}
