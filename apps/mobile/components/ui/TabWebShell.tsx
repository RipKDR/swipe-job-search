import { View } from "@/components/tw";
import { Platform } from "react-native";
import type { ReactNode } from "react";
import { contentMaxWidthTab, screenPadding } from "@/lib/responsive-layout";

type TabWebShellProps = {
  children: ReactNode;
};

/**
 * On web at lg+, constrains tab content so lists/forms do not stretch edge-to-edge.
 * Native: passthrough (full width).
 */
export function TabWebShell({ children }: TabWebShellProps) {
  if (Platform.OS !== "web") {
    return <View className="flex-1">{children}</View>;
  }

  return (
    <View className={`flex-1 w-full ${screenPadding}`}>
      <View className={`flex-1 ${contentMaxWidthTab}`}>{children}</View>
    </View>
  );
}
