'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function ProductSortSelect({ currentSortUrl, options }) {
  const router = useRouter();

  const handleChange = (e) => {
    router.push(e.target.value);
  };

  return (
    <select
      className="sort-select"
      value={currentSortUrl}
      onChange={handleChange}
      aria-label="Sort products"
    >
      {options.map((opt) => (
        <option key={opt.url} value={opt.url}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
