import { ArrowLeft } from "lucide-react";

/** The way out of any tool: back to the /tools/ hub. */
export default function ToolBack({ label = "All tools", end = false }: { label?: string; end?: boolean }) {
  return (
    <a className={`tool-back${end ? " is-end" : ""}`} href="/tools/">
      <ArrowLeft size={15} aria-hidden="true" /> {label}
    </a>
  );
}
