/**
 * CSS-in-RN wrappers — web-safe version.
 * On native: uses react-native-css useCssElement for Tailwind integration.
 * On web: passes className directly (react-native-web handles it).
 */
import { Platform, StyleSheet } from "react-native";
import { Link as RouterLink } from "expo-router";
import Animated from "react-native-reanimated";
import React from "react";
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TouchableHighlight as RNTouchableHighlight,
  TextInput as RNTextInput,
} from "react-native";

// Web-safe wrapper: strips className, passes rest as props
function webWrapper<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>
) {
  return function WebWrapper(props: P & { className?: string; contentContainerClassName?: string }) {
    const { className: _cn, contentContainerClassName: _ccn, ...rest } = props as Record<string, unknown>;
    return <Component {...rest as P} />;
  };
}

// Native: use react-native-css useCssElement
let useCssElement: (component: unknown, props: unknown, mapping: unknown) => React.ReactElement;
let useFunctionalVariable: (variable: string) => string;

if (Platform.OS === "web") {
  // Web fallback: simple passthrough wrappers
  useCssElement = (Component: unknown, props: Record<string, unknown>, _mapping: unknown) => {
    const { className: _cn, contentContainerClassName: _ccn, ...rest } = props;
    return React.createElement(Component as React.ComponentType, rest);
  };
  useFunctionalVariable = (variable: string) => `var(${variable})`;
} else {
  // Native: lazy import react-native-css
  try {
    const cssModule = require("react-native-css");
    useCssElement = cssModule.useCssElement;
    useFunctionalVariable = cssModule.useNativeVariable;
  } catch {
    // Fallback if react-native-css not available
    useCssElement = (Component: unknown, props: Record<string, unknown>, _mapping: unknown) => {
      const { className: _cn, contentContainerClassName: _ccn, ...rest } = props;
      return React.createElement(Component as React.ComponentType, rest);
    };
    useFunctionalVariable = (variable: string) => `var(${variable})`;
  }
}

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string }
) => {
  return useCssElement(RouterLink, props, { className: "style" });
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps) => {
  return useCssElement(RNView, props, { className: "style" });
};
View.displayName = "CSS(View)";

export const Text = (
  props: React.ComponentProps<typeof RNText> & { className?: string }
) => {
  return useCssElement(RNText, props, { className: "style" });
};
Text.displayName = "CSS(Text)";

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(RNScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
};
ScrollView.displayName = "CSS(ScrollView)";

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string }
) => {
  return useCssElement(RNPressable, props, { className: "style" });
};
Pressable.displayName = "CSS(Pressable)";

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string }
) => {
  return useCssElement(RNTextInput, props, { className: "style" });
};
TextInput.displayName = "CSS(TextInput)";

export const AnimatedScrollView = (
  props: React.ComponentProps<typeof Animated.ScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(Animated.ScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
};

function XXTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>
) {
  const { underlayColor, ...style } = StyleSheet.flatten(props.style) || {};
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor as string | undefined}
      {...props}
      style={style}
    />
  );
}

export const TouchableHighlight = (
  props: React.ComponentProps<typeof RNTouchableHighlight> & {
    className?: string;
  }
) => {
  return useCssElement(XXTouchableHighlight, props, { className: "style" });
};
TouchableHighlight.displayName = "CSS(TouchableHighlight)";
