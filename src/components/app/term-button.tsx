import type { FC, ReactNode } from "react";
import Link from "next/link";
import { cx } from "@/utils/cx";

type IconType = FC<{ className?: string }>;

const VARIANT_CLASSES = {
    solid: "border border-brand bg-brand-solid text-primary_on-brand hover:bg-brand-solid_hover",
    outline: "border border-secondary text-tertiary hover:border-brand hover:text-brand-secondary",
    "ghost-icon": "border border-secondary text-fg-quaternary hover:border-brand hover:text-brand-secondary",
} as const;

const SIZE_CLASSES = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3 py-1.5 text-xs",
} as const;

type TermButtonProps = {
    children?: ReactNode;
    onClick?: () => void;
    href?: string;
    variant?: keyof typeof VARIANT_CLASSES;
    size?: keyof typeof SIZE_CLASSES;
    iconLeading?: IconType;
    iconTrailing?: IconType;
    isDisabled?: boolean;
    "aria-label"?: string;
    title?: string;
    className?: string;
};

/** Bracket-box terminal action control — the shared shape for every clickable action across the app (nav aside excepted). */
export function TermButton({
    children,
    onClick,
    href,
    variant = "outline",
    size = "md",
    iconLeading: IconLeading,
    iconTrailing: IconTrailing,
    isDisabled,
    "aria-label": ariaLabel,
    title,
    className,
}: TermButtonProps) {
    const isIconOnly = variant === "ghost-icon";
    const classes = cx(
        "flex shrink-0 items-center gap-1.5 font-semibold tracking-widest uppercase transition duration-100 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        isIconOnly ? "size-7 justify-center p-0" : SIZE_CLASSES[size],
        className,
    );

    const content = (
        <>
            {IconLeading && <IconLeading className="size-3.5 shrink-0" />}
            {children}
            {IconTrailing && <IconTrailing className="size-3.5 shrink-0" />}
        </>
    );

    if (href) {
        return (
            <Link href={href} aria-label={ariaLabel} title={title} className={classes}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} disabled={isDisabled} aria-label={ariaLabel} title={title} className={classes}>
            {content}
        </button>
    );
}
