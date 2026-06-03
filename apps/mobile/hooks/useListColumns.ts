import { useWindowDimensions } from "react-native";
import { BREAKPOINTS } from "@/lib/responsive-layout";

/**
 * Responsive column count for FlatList (2 columns from md breakpoint).
 */
export function useListColumns(maxColumns = 2): number {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINTS.lg && maxColumns >= 2) return Math.min(maxColumns, 2);
  if (width >= BREAKPOINTS.md && maxColumns >= 2) return 2;
  return 1;
}
