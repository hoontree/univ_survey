"use client";

import { cx } from "./tokens";

interface OptionButtonProps {
  value: number;
  label: string;
  selected?: boolean;
  onClick: () => void;
}

/** 설문 선택지 — 원형 번호 배지 + 라벨. 선택 시 인디고 보더/필과 배지 반전. */
export function OptionButton({
  value,
  label,
  selected = false,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx("univ-option", selected && "univ-option--selected")}
    >
      <span className="univ-option__num" aria-hidden>
        {value}
      </span>
      <span className="univ-option__label">{label}</span>
    </button>
  );
}
