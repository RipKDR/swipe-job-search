import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import type { TouchableOpacityProps } from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "inverse";
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-indigo-600 active:bg-indigo-500",
    secondary: "bg-slate-800 active:bg-slate-700",
    ghost: "bg-transparent active:bg-slate-800/50",
    outline: "bg-slate-900 border border-slate-700 active:bg-slate-800",
    inverse: "bg-white active:bg-slate-100",
  };

  const textStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "text-white",
    secondary: "text-white",
    ghost: "text-indigo-400",
    outline: "text-white",
    inverse: "text-slate-900",
  };

  const spinnerColor =
    variant === "ghost" ? "#818cf8" : variant === "inverse" ? "#0f172a" : "#ffffff";

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`px-6 py-4 rounded-xl flex-row items-center justify-center ${variantStyles[variant]} ${isDisabled ? "opacity-50" : ""} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text className={`font-semibold text-base text-center ${textStyles[variant]}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
