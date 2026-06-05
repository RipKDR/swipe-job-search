/**
 * CSS-in-RN wrappers — web-safe version.
 * Re-exports react-native-css components (single className→style mapping) with
 * forwardRef for Reanimated. Raw RN primitives get one useCssElement pass only.
 */
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  StyleSheet,
  TouchableHighlight as RNTouchableHighlight,
} from "react-native";
import { Link as RouterLink } from "expo-router";
import React from "react";
import {
  View as CSSView,
  Text as CSSText,
  TextInput as CSSTextInput,
} from "react-native-css/components";

let useCssElement: (
  component: React.ComponentType<any>,
  props: any,
  mapping: Record<string, string>
) => React.ReactElement;
let useFunctionalVariable: (variable: string) => string;

try {
  const cssModule = require("react-native-css");
  useCssElement = cssModule.useCssElement;
  useFunctionalVariable = cssModule.useNativeVariable;
} catch {
  useCssElement = (Component, props, _mapping) => {
    const { className: _cn, contentContainerClassName: _ccn, ...rest } = props;
    return React.createElement(Component, rest);
  };
  useFunctionalVariable = (variable: string) => `var(${variable})`;
}

const cssMapping = { className: "style" } as const;

type LinkProps = React.ComponentProps<typeof RouterLink> & { className?: string };

const LinkBase = React.forwardRef<
  React.ComponentRef<typeof RouterLink>,
  LinkProps
>(function Link(props, ref) {
  return useCssElement(RouterLink, { ...props, ref }, cssMapping);
});
LinkBase.displayName = "CSS(Link)";

export const Link = Object.assign(LinkBase, {
  Trigger: RouterLink.Trigger,
  Menu: RouterLink.Menu,
  MenuAction: RouterLink.MenuAction,
  Preview: RouterLink.Preview,
});

export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

export type ViewProps = React.ComponentProps<typeof CSSView> & {
  className?: string;
};

export const View = React.forwardRef<React.ElementRef<typeof CSSView>, ViewProps>(
  function View(props, ref) {
    return <CSSView {...props} ref={ref as React.Ref<React.ElementRef<typeof CSSView>>} />;
  }
);
View.displayName = "CSS(View)";

export const Text = React.forwardRef<
  React.ElementRef<typeof CSSText>,
  React.ComponentProps<typeof CSSText> & { className?: string }
>(function Text(props, ref) {
  return <CSSText {...props} ref={ref as React.Ref<React.ElementRef<typeof CSSText>>} />;
});
Text.displayName = "CSS(Text)";

export const ScrollView = React.forwardRef<
  React.ElementRef<typeof RNScrollView>,
  React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
>(function ScrollView(props, ref) {
  return useCssElement(RNScrollView, { ...props, ref }, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
});
ScrollView.displayName = "CSS(ScrollView)";

export const Pressable = React.forwardRef<
  React.ElementRef<typeof RNPressable>,
  React.ComponentProps<typeof RNPressable> & { className?: string }
>(function Pressable(props, ref) {
  return useCssElement(RNPressable, { ...props, ref }, cssMapping);
});
Pressable.displayName = "CSS(Pressable)";

export const TextInput = React.forwardRef<
  React.ElementRef<typeof CSSTextInput>,
  React.ComponentProps<typeof CSSTextInput> & { className?: string }
>(function TextInput(props, ref) {
  return <CSSTextInput {...props} ref={ref as React.Ref<React.ElementRef<typeof CSSTextInput>>} />;
});
TextInput.displayName = "CSS(TextInput)";

const XXTouchableHighlight = React.forwardRef<
  React.ElementRef<typeof RNTouchableHighlight>,
  React.ComponentProps<typeof RNTouchableHighlight>
>(function XXTouchableHighlight(props, ref) {
  type FlatStyle = { underlayColor?: string; [key: string]: unknown };
  const flattened = (StyleSheet.flatten(props.style) || {}) as FlatStyle;
  const { underlayColor, ...style } = flattened;
  return (
    <RNTouchableHighlight
      ref={ref}
      underlayColor={underlayColor as string | undefined}
      {...props}
      style={style}
    />
  );
});
XXTouchableHighlight.displayName = "CSS(XXTouchableHighlight)";

export const TouchableHighlight = React.forwardRef<
  React.ElementRef<typeof RNTouchableHighlight>,
  React.ComponentProps<typeof RNTouchableHighlight> & {
    className?: string;
  }
>(function TouchableHighlight(props, ref) {
  return useCssElement(XXTouchableHighlight, { ...props, ref }, cssMapping);
});
TouchableHighlight.displayName = "CSS(TouchableHighlight)";
