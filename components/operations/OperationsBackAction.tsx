"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { operationsVisual } from "@/features/operations/visual";

type SharedProps = {
  label: string;
  locale: "ar" | "en";
  className?: string;
};

type OperationsBackActionProps =
  | (SharedProps & { href: string; onClick?: never })
  | (SharedProps & { href?: never; onClick: () => void });

export default function OperationsBackAction({
  label,
  locale,
  className = "",
  ...target
}: OperationsBackActionProps) {
  const router = useRouter();
  const Icon = locale === "ar" ? ArrowRight : ArrowLeft;

  const handleClick = () => {
    if ("onClick" in target && target.onClick) {
      target.onClick();
      return;
    }

    if ("href" in target) {
      router.push(target.href);
    }
  };

  return (
    <button
      type="button"
      dir={locale === "ar" ? "rtl" : "ltr"}
      onClick={handleClick}
      className={[operationsVisual.secondaryButton, className]
        .filter(Boolean)
        .join(" ")}
      data-operations-back-action
    >
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
