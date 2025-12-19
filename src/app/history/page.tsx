"use client";
import { useEffect, useState } from "react";

export default function History() {
  const [i, s] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/history").then(r => r.json()).then(d => s(d.items));
  }, []);
  return <div>{i.map(x => <div key={x.id}>{x.productName}</div>)}</div>;
}